import type { ProfileValidationResult, UserProfile } from "../../types/profile";
import { profileRepository, type ProfileRepository } from "./profileRepository";

export class ProfileService {
  constructor(private repo: ProfileRepository = profileRepository) {}

  getProfile(): UserProfile {
    return this.repo.getProfile();
  }

  saveProfile(profile: UserProfile): { success: boolean; errors?: Partial<Record<keyof UserProfile, string>> } {
    const validation = this.validateProfile(profile);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const saved = this.repo.saveProfile(profile);
    return { success: saved };
  }

  resetProfile(): UserProfile {
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

    if (profile.avatar) {
      const avatarTrim = profile.avatar.trim();
      if (avatarTrim && !/^https?:\/\/.+/.test(avatarTrim) && !avatarTrim.startsWith("data:image/")) {
        errors.avatar = "Ссылка на аватар должна начинаться с http:// или https://";
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  getInitials(displayName: string, username: string): string {
    const name = displayName.trim() || username.trim() || "U";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}

export const profileService = new ProfileService();
