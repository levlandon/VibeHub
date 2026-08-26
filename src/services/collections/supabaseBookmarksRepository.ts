import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookmarkType, SavedItem } from "../../types/saved";
import { savedId } from "../saved";
import type { BookmarksRepository } from "./localStorageBookmarksRepository";

/**
 * Supabase implementation of BookmarksRepository.
 *
 * Domain / Snapshot Notes:
 * - Identity is strictly `(entity_type, entity_id)` (e.g. `kind` + `targetId`).
 * - Snapshot fields (`title`, `subtitle`, `url`, `metadata`) are stored for display fallback
 *   when catalog items are removed or external (e.g. GitHub repos).
 * - UI layers resolve live entities from the catalog when available, and use snapshot fields as fallback.
 */
export class SupabaseBookmarksRepository implements BookmarksRepository {
  private client: SupabaseClient | null;
  private fallbackRepo: BookmarksRepository;

  constructor(client: SupabaseClient | null, fallbackRepo: BookmarksRepository) {
    this.client = client;
    this.fallbackRepo = fallbackRepo;
  }

  async getBookmarks(): Promise<SavedItem[]> {
    if (!this.client) {
      return this.fallbackRepo.getBookmarks();
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.getBookmarks();
    }

    const { data, error } = await this.client
      .from("saved_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((row) => {
      const meta = (row.metadata as Record<string, unknown>) || {};
      const kind = row.entity_type as BookmarkType;
      return {
        id: row.id || savedId(kind, row.entity_id),
        kind,
        targetId: row.entity_id,
        title: row.title || "",
        subtitle: row.subtitle || undefined,
        url: row.url || undefined,
        savedAt: row.created_at,
        owner: typeof meta.owner === "string" ? meta.owner : undefined,
        name: typeof meta.name === "string" ? meta.name : undefined,
        description: typeof meta.description === "string" ? meta.description : undefined,
        avatar: typeof meta.avatar === "string" ? meta.avatar : undefined,
      };
    });
  }

  async saveBookmark(item: Omit<SavedItem, "id" | "savedAt">): Promise<SavedItem> {
    if (!this.client) {
      return this.fallbackRepo.saveBookmark(item);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.saveBookmark(item);
    }

    const metadata: Record<string, string> = {};
    if (item.owner) metadata.owner = item.owner;
    if (item.name) metadata.name = item.name;
    if (item.description) metadata.description = item.description;
    if (item.avatar) metadata.avatar = item.avatar;

    const { data, error } = await this.client
      .from("saved_items")
      .upsert(
        {
          user_id: session.user.id,
          entity_type: item.kind,
          entity_id: item.targetId,
          title: item.title || "",
          subtitle: item.subtitle || "",
          url: item.url || "",
          metadata,
        },
        { onConflict: "user_id,entity_type,entity_id" },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    const meta = (data.metadata as Record<string, unknown>) || {};
    const kind = data.entity_type as BookmarkType;
    return {
      id: data.id || savedId(kind, data.entity_id),
      kind,
      targetId: data.entity_id,
      title: data.title,
      subtitle: data.subtitle || undefined,
      url: data.url || undefined,
      savedAt: data.created_at,
      owner: typeof meta.owner === "string" ? meta.owner : undefined,
      name: typeof meta.name === "string" ? meta.name : undefined,
      description: typeof meta.description === "string" ? meta.description : undefined,
      avatar: typeof meta.avatar === "string" ? meta.avatar : undefined,
    };
  }

  async removeBookmark(kind: string, targetId: string): Promise<boolean> {
    if (!this.client) {
      return this.fallbackRepo.removeBookmark(kind, targetId);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.removeBookmark(kind, targetId);
    }

    const { error } = await this.client
      .from("saved_items")
      .delete()
      .eq("user_id", session.user.id)
      .eq("entity_type", kind)
      .eq("entity_id", targetId);

    if (error) {
      throw error;
    }

    return true;
  }

  async saveBookmarks(items: SavedItem[]): Promise<boolean> {
    if (!this.client) {
      return this.fallbackRepo.saveBookmarks(items);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.saveBookmarks(items);
    }

    // Authenticated users save items individually via saveBookmark / removeBookmark
    return true;
  }
}
