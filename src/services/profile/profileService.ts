import type { ProfileUpdate, ProfileValidationResult, UserProfile } from "../../types/profile";
import { DEFAULT_USER_PROFILE, profileRepository, type ProfileRepository } from "./profileRepository";

export class ProfileService {
  private profileCache = new Map<string, Promise<UserProfile | null>>();

  constructor(private repo: ProfileRepository = profileRepository) {}

  async getProfile(identifier?: string): Promise<UserProfile | null> {
    if (!identifier) return null;
    const key = identifier.toLowerCase().trim();
    if (this.profileCache.has(key)) {
      return this.profileCache.get(key)!;
    }
    const promise = this.repo.getProfile(identifier).catch((err) => {
      this.profileCache.delete(key);
      throw err;
    });
    this.profileCache.set(key, promise);
    return promise;
  }

  clearProfileCache(identifier?: string) {
    if (identifier) {
      this.profileCache.delete(identifier.toLowerCase().trim());
    } else {
      this.profileCache.clear();
    }
  }

  async getCurrentProfile(userId?: string): Promise<UserProfile | null> {
    return this.repo.getProfile(userId);
  }

  async updateCurrentProfile(updates: ProfileUpdate, currentUserId?: string): Promise<UserProfile> {
    const current = (await this.getCurrentProfile(currentUserId)) || (await this.repo.resetProfile());
    const modelIds =
      updates.modelIds !== undefined
        ? updates.modelIds
        : updates.models !== undefined
          ? updates.models
          : current.modelIds;

    const avatarUrl =
      updates.avatarUrl !== undefined
        ? updates.avatarUrl
        : updates.avatar !== undefined
          ? updates.avatar
          : current.avatarUrl;

    const merged: UserProfile = {
      ...current,
      ...updates,
      id: current.id,
      displayName: updates.displayName !== undefined ? updates.displayName.trim() : current.displayName,
      username: updates.username !== undefined ? updates.username.trim().toLowerCase() : current.username,
      avatarUrl,
      avatar: avatarUrl,
      bio: updates.bio !== undefined ? updates.bio.trim() : current.bio,
      modelIds,
      models: modelIds,
      interests: updates.interests !== undefined ? updates.interests : current.interests,
      updatedAt: new Date().toISOString(),
    };

    const validation = this.validateProfile(merged);
    if (!validation.valid) {
      const errorMsg = Object.values(validation.errors).join("; ");
      throw new Error(`Validation failed: ${errorMsg}`);
    }

    await this.repo.saveProfile(merged);
    return merged;
  }

  async saveProfile(profile: UserProfile): Promise<{ success: boolean; errors?: Partial<Record<keyof UserProfile, string>> }> {
    const validation = this.validateProfile(profile);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const saved = await this.repo.saveProfile(profile);
    return { success: saved };
  }

  async resetProfile(): Promise<UserProfile> {
    return this.repo.resetProfile();
  }

  validateProfile(profile: Partial<UserProfile>): ProfileValidationResult {
    const errors: Partial<Record<keyof UserProfile, string>> = {};
    const errorKeys: Partial<Record<keyof UserProfile, string>> = {};

    const setError = (
      field: keyof UserProfile,
      message: string,
      key: string,
    ) => {
      errors[field] = message;
      errorKeys[field] = key;
    };

    const displayName = profile.displayName?.trim() ?? "";
    if (!displayName) {
      setError("displayName", "Имя обязательно для заполнения", "profile.validation.displayNameRequired");
    } else if (displayName.length > 50) {
      setError("displayName", "Имя не должно превышать 50 символов", "profile.validation.displayNameMax");
    }

    const username = profile.username?.trim() ?? "";
    if (!username) {
      setError("username", "Username обязателен", "profile.validation.usernameRequired");
    } else if (username.length < 2) {
      setError("username", "Username должен содержать минимум 2 символа", "profile.validation.usernameMin");
    } else if (username.length > 30) {
      setError("username", "Username не должен превышать 30 символов", "profile.validation.usernameMax");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError("username", "Username может содержать только латиницу, цифры, дефис и подчеркивание", "profile.validation.usernameChars");
    }

    const bio = profile.bio ?? "";
    if (bio.length > 160) {
      setError("bio", "Bio не должно превышать 160 символов", "profile.validation.bioMax");
    }

    const avatar = profile.avatarUrl !== undefined ? profile.avatarUrl : profile.avatar;
    if (avatar) {
      const avatarTrim = avatar.trim();
      if (avatarTrim && !/^https?:\/\/.+/.test(avatarTrim) && !avatarTrim.startsWith("data:image/")) {
        setError("avatar", "Ссылка на аватар должна начинаться с http:// или https://", "profile.validation.avatarUrl");
      }
    }

    const models = profile.modelIds || profile.models;
    if (models && models.length > 8) {
      setError("models", "Можно выбрать максимум 8 моделей", "profile.validation.modelsMax");
    }

    if (profile.interests && profile.interests.length > 6) {
      setError("interests", "Можно выбрать максимум 6 направлений", "profile.validation.interestsMax");
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      errorKeys,
    };
  }

  getInitials(displayName?: string, username?: string): string {
    const name = displayName?.trim() || username?.trim() || DEFAULT_USER_PROFILE.displayName;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}

export const profileService = new ProfileService();
