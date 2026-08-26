import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "../../types/profile";
import type { ProfileRepository } from "./profileRepository";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupabaseProfileRepository implements ProfileRepository {
  private client: SupabaseClient | null;
  private fallbackRepo: ProfileRepository;

  constructor(client: SupabaseClient | null, fallbackRepo: ProfileRepository) {
    this.client = client;
    this.fallbackRepo = fallbackRepo;
  }

  async getProfile(userId?: string): Promise<UserProfile | null> {
    if (!this.client) {
      return this.fallbackRepo.getProfile(userId);
    }

    if (!userId) {
      return null;
    }

    const isUuid = UUID_REGEX.test(userId);
    let query = this.client.from("profiles").select("*");
    if (isUuid) {
      query = query.eq("id", userId);
    } else {
      query = query.eq("handle", userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const modelIds = Array.isArray(data.model_ids) ? data.model_ids : [];
    const interests = Array.isArray(data.interests) ? data.interests : [];
    const avatarUrl = data.avatar_url || "";

    return {
      id: data.id,
      displayName: data.name || "Пользователь",
      username: data.handle || "user",
      avatarUrl,
      avatar: avatarUrl,
      bio: data.bio || "",
      modelIds,
      models: modelIds,
      interests,
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  }

  async saveProfile(profile: UserProfile): Promise<boolean> {
    if (!this.client) {
      return this.fallbackRepo.saveProfile(profile);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    const targetId = profile.id || session?.user?.id;
    if (!targetId) {
      throw new Error("Не удалось определить ID пользователя для сохранения профиля");
    }

    const name = profile.displayName.trim();
    const handle = profile.username.trim().toLowerCase();
    const parts = name.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase() || "VH";

    const avatarUrl = profile.avatarUrl !== undefined ? profile.avatarUrl : (profile.avatar || "");
    const modelIds = Array.isArray(profile.modelIds)
      ? profile.modelIds
      : (Array.isArray(profile.models) ? profile.models : []);
    const interests = Array.isArray(profile.interests) ? profile.interests : [];
    const bio = (profile.bio || "").trim();

    const { error } = await this.client
      .from("profiles")
      .update({
        name,
        handle,
        initials,
        bio,
        avatar_url: avatarUrl,
        model_ids: modelIds,
        interests,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId);

    if (error) {
      throw error;
    }

    return true;
  }

  async resetProfile(): Promise<UserProfile> {
    return this.fallbackRepo.resetProfile();
  }
}
