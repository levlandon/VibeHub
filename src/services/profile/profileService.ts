import type { ProfileUpdate, ProfileValidationResult, UserProfile } from "../../types/profile";
import { DEFAULT_USER_PROFILE, profileRepository, type ProfileRepository } from "./profileRepository";

export class ProfileService {
  constructor(private repo: ProfileRepository = profileRepository) {}

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

    const displayName = profile.displayName?.trim() ?? "";
    if (!displayName) {
      errors.displayName = "Имя обязательно для заполнения";
    } else if (displayName.length > 50) {
      errors.displayName = "Имя не должно превышать 50 символов";
    }

    const username = profile.username?.trim() ?? "";
    if (!username) {
      errors.username = "Username обязателен";
    } else if (username.length < 2) {
      errors.username = "Username должен содержать минимум 2 символа";
    } else if (username.length > 30) {
      errors.username = "Username не должен превышать 30 символов";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.username = "Username может содержать только латиницу, цифры, дефис и подчеркивание";
    }

    const bio = profile.bio ?? "";
    if (bio.length > 160) {
      errors.bio = "Bio не должно превышать 160 символов";
    }

    const avatar = profile.avatarUrl !== undefined ? profile.avatarUrl : profile.avatar;
    if (avatar) {
      const avatarTrim = avatar.trim();
      if (avatarTrim && !/^https?:\/\/.+/.test(avatarTrim) && !avatarTrim.startsWith("data:image/")) {
        errors.avatar = "Ссылка на аватар должна начинаться с http:// или https://";
      }
    }

    const models = profile.modelIds || profile.models;
    if (models && models.length > 8) {
      errors.models = "Можно выбрать максимум 8 моделей";
    }

    if (profile.interests && profile.interests.length > 6) {
      errors.interests = "Можно выбрать максимум 6 направлений";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
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

