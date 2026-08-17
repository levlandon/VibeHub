import { localStorageDriver, STORAGE_KEYS } from "../storage/localStorageDriver";
import type { UserProfile } from "../../types/profile";

export const DEFAULT_INTEREST_TAGS = [
  "Coding",
  "Research",
  "Design",
  "3D",
  "Writing",
  "Data",
  "Education",
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  avatar: "",
  displayName: "User",
  username: "user",
  bio: "AI enthusiast & builder",
  models: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
  interests: ["Coding", "Research"],
  updatedAt: new Date().toISOString(),
};

export interface ProfileRepository {
  getProfile(): UserProfile;
  saveProfile(profile: UserProfile): boolean;
  resetProfile(): UserProfile;
}

export class LocalStorageProfileRepository implements ProfileRepository {
  getProfile(): UserProfile {
    const data = localStorageDriver.getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE);
    if (!data) {
      return { ...DEFAULT_USER_PROFILE };
    }

    return {
      avatar: typeof data.avatar === "string" ? data.avatar : DEFAULT_USER_PROFILE.avatar,
      displayName: typeof data.displayName === "string" && data.displayName.trim() ? data.displayName.trim() : DEFAULT_USER_PROFILE.displayName,
      username: typeof data.username === "string" && data.username.trim() ? data.username.trim().toLowerCase() : DEFAULT_USER_PROFILE.username,
      bio: typeof data.bio === "string" ? data.bio : DEFAULT_USER_PROFILE.bio,
      models: Array.isArray(data.models) ? data.models : DEFAULT_USER_PROFILE.models,
      interests: Array.isArray(data.interests) ? data.interests : DEFAULT_USER_PROFILE.interests,
      codingAgents: Array.isArray(data.codingAgents) ? data.codingAgents : undefined,
      tools: Array.isArray(data.tools) ? data.tools : undefined,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  saveProfile(profile: UserProfile): boolean {
    const payload: UserProfile = {
      ...profile,
      displayName: profile.displayName.trim(),
      username: profile.username.trim().toLowerCase(),
      bio: profile.bio.trim(),
      models: Array.isArray(profile.models) ? profile.models : [],
      interests: Array.isArray(profile.interests) ? profile.interests : [],
      updatedAt: new Date().toISOString(),
    };
    return localStorageDriver.setItem(STORAGE_KEYS.USER_PROFILE, payload);
  }

  resetProfile(): UserProfile {
    const defaultCopy = { ...DEFAULT_USER_PROFILE, updatedAt: new Date().toISOString() };
    localStorageDriver.setItem(STORAGE_KEYS.USER_PROFILE, defaultCopy);
    return defaultCopy;
  }
}

export const profileRepository = new LocalStorageProfileRepository();
