import type { SupabaseClient } from "@supabase/supabase-js";
import { faviconFor, parseSiteUrl } from "../../lib/siteUrl";
import type {
  Collection,
  CollectionItem,
  CreateCollectionInput,
  CreateCollectionItemInput,
  UpdateCollectionInput,
} from "../../types/collections";
import type { CollectionsRepository } from "./types";

interface CollectionItemDbRow {
  id: string;
  collection_id: string;
  url: string;
  title: string;
  domain: string;
  description: string;
  favicon: string;
  entity_type: string | null;
  entity_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface CollectionDbRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  items?: CollectionItemDbRow[];
}

function mapItemRow(row: CollectionItemDbRow): CollectionItem {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    domain: row.domain,
    description: row.description || undefined,
    favicon: row.favicon || undefined,
    createdAt: row.created_at,
  };
}

function mapCollectionRow(row: CollectionDbRow): Collection {
  const items = Array.isArray(row.items)
    ? [...row.items]
        .sort((a, b) => a.position - b.position || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(mapItemRow)
    : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export class SupabaseCollectionsRepository implements CollectionsRepository {
  private client: SupabaseClient | null;
  private fallbackRepo: CollectionsRepository;

  constructor(client: SupabaseClient | null, fallbackRepo: CollectionsRepository) {
    this.client = client;
    this.fallbackRepo = fallbackRepo;
  }

  async getCollections(): Promise<Collection[]> {
    if (!this.client) {
      return this.fallbackRepo.getCollections();
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.getCollections();
    }

    const { data, error } = await this.client
      .from("collections")
      .select("*, items:collection_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(mapCollectionRow);
  }

  async getCollection(id: string): Promise<Collection | null> {
    if (!this.client) {
      return this.fallbackRepo.getCollection(id);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.getCollection(id);
    }

    const { data, error } = await this.client
      .from("collections")
      .select("*, items:collection_items(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) return null;
    return mapCollectionRow(data);
  }

  async createCollection(input: CreateCollectionInput): Promise<Collection> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Название коллекции не может быть пустым");
    }

    if (!this.client) {
      return this.fallbackRepo.createCollection(input);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.createCollection(input);
    }

    const { data, error } = await this.client
      .from("collections")
      .insert({
        user_id: session.user.id,
        name,
        description: input.description?.trim() || "",
      })
      .select("*, items:collection_items(*)")
      .single();

    if (error) {
      throw error;
    }

    return mapCollectionRow(data);
  }

  async updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection> {
    if (!this.client) {
      return this.fallbackRepo.updateCollection(id, input);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.updateCollection(id, input);
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) throw new Error("Название коллекции не может быть пустым");
      updates.name = trimmed;
    }
    if (input.description !== undefined) {
      updates.description = input.description.trim();
    }

    const { data, error } = await this.client
      .from("collections")
      .update(updates)
      .eq("id", id)
      .select("*, items:collection_items(*)")
      .single();

    if (error) {
      throw error;
    }

    return mapCollectionRow(data);
  }

  async deleteCollection(id: string): Promise<boolean> {
    if (!this.client) {
      return this.fallbackRepo.deleteCollection(id);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.deleteCollection(id);
    }

    const { error } = await this.client.from("collections").delete().eq("id", id);
    if (error) {
      throw error;
    }

    return true;
  }

  async addItem(
    collectionId: string,
    input: CreateCollectionItemInput,
  ): Promise<CollectionItem> {
    if (!this.client) {
      return this.fallbackRepo.addItem(collectionId, input);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.addItem(collectionId, input);
    }

    const parsed = parseSiteUrl(input.url);
    const domain = input.domain || parsed?.domain || "";
    const url = parsed?.url || input.url.trim();
    const title = input.title?.trim() || parsed?.title || domain || url;
    const favicon = input.favicon || (domain ? faviconFor(domain) : "");

    const { data, error } = await this.client
      .from("collection_items")
      .upsert(
        {
          collection_id: collectionId,
          url,
          title,
          domain,
          description: input.description?.trim() || "",
          favicon,
        },
        { onConflict: "collection_id,url" },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapItemRow(data);
  }

  async updateItem(
    collectionId: string,
    itemId: string,
    changes: Partial<CollectionItem>,
  ): Promise<CollectionItem> {
    if (!this.client) {
      return this.fallbackRepo.updateItem(collectionId, itemId, changes);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.updateItem(collectionId, itemId, changes);
    }

    const updates: Record<string, unknown> = {};
    if (changes.title !== undefined) updates.title = changes.title.trim();
    if (changes.description !== undefined) updates.description = changes.description.trim();
    if (changes.url !== undefined) updates.url = changes.url.trim();
    if (changes.domain !== undefined) updates.domain = changes.domain;
    if (changes.favicon !== undefined) updates.favicon = changes.favicon;

    const { data, error } = await this.client
      .from("collection_items")
      .update(updates)
      .eq("id", itemId)
      .eq("collection_id", collectionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapItemRow(data);
  }

  async removeItem(collectionId: string, itemId: string): Promise<boolean> {
    if (!this.client) {
      return this.fallbackRepo.removeItem(collectionId, itemId);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.removeItem(collectionId, itemId);
    }

    const { error } = await this.client
      .from("collection_items")
      .delete()
      .eq("id", itemId)
      .eq("collection_id", collectionId);

    if (error) {
      throw error;
    }

    return true;
  }

  async moveItem(
    fromCollectionId: string,
    toCollectionId: string,
    itemId: string,
  ): Promise<boolean> {
    if (fromCollectionId === toCollectionId) return true;

    if (!this.client) {
      return this.fallbackRepo.moveItem(fromCollectionId, toCollectionId, itemId);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session?.user) {
      return this.fallbackRepo.moveItem(fromCollectionId, toCollectionId, itemId);
    }

    const { error } = await this.client
      .from("collection_items")
      .update({ collection_id: toCollectionId })
      .eq("id", itemId)
      .eq("collection_id", fromCollectionId);

    if (error) {
      throw error;
    }

    return true;
  }
}
