import { localStorageDriver, STORAGE_KEYS } from "../storage/localStorageDriver";
import type { UserProfile } from "../../types/profile";

export const DEFAULT_INTEREST_TAGS = [
  "Coding",
  "Research",
  "Design",
  "3D",
  "Data",
  "Writing",
  "Product",
  "Automation",
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: "user-dev-1",
  avatarUrl: "",
  displayName: "User",
  username: "user",
  bio: "AI enthusiast & builder",
  modelIds: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
  interests: ["Coding", "Research"],
  avatar: "",
  models: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
  updatedAt: new Date().toISOString(),
};

export interface ProfileRepository {
  getProfile(userId?: string): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<boolean>;
  resetProfile(): Promise<UserProfile>;
}

export class LocalStorageProfileRepository implements ProfileRepository {
  async getProfile(userId?: string): Promise<UserProfile> {
    const data = localStorageDriver.getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE);
    if (!data) {
      return { ...DEFAULT_USER_PROFILE, id: userId || DEFAULT_USER_PROFILE.id };
    }

    const avatarUrl =
      typeof data.avatarUrl === "string"
        ? data.avatarUrl
        : typeof data.avatar === "string"
          ? data.avatar
          : DEFAULT_USER_PROFILE.avatarUrl;

    const modelIds = Array.isArray(data.modelIds)
      ? data.modelIds
      : Array.isArray(data.models)
        ? data.models
        : DEFAULT_USER_PROFILE.modelIds;

    const interests = Array.isArray(data.interests)
      ? data.interests
      : DEFAULT_USER_PROFILE.interests;

    return {
      id: data.id || userId || DEFAULT_USER_PROFILE.id,
      avatarUrl,
      avatar: avatarUrl,
      displayName:
        typeof data.displayName === "string" && data.displayName.trim()
          ? data.displayName.trim()
          : DEFAULT_USER_PROFILE.displayName,
      username:
        typeof data.username === "string" && data.username.trim()
          ? data.username.trim().toLowerCase()
          : DEFAULT_USER_PROFILE.username,
      bio: typeof data.bio === "string" ? data.bio : DEFAULT_USER_PROFILE.bio,
      modelIds,
      models: modelIds,
      interests,
      codingAgents: Array.isArray(data.codingAgents) ? data.codingAgents : undefined,
      tools: Array.isArray(data.tools) ? data.tools : undefined,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  async saveProfile(profile: UserProfile): Promise<boolean> {
    const avatarUrl = profile.avatarUrl !== undefined ? profile.avatarUrl : profile.avatar || "";
    const modelIds = Array.isArray(profile.modelIds)
      ? profile.modelIds
      : Array.isArray(profile.models)
        ? profile.models
        : [];
    const interests = Array.isArray(profile.interests) ? profile.interests : [];

    const payload: UserProfile = {
      ...profile,
      id: profile.id || DEFAULT_USER_PROFILE.id,
      avatarUrl,
      avatar: avatarUrl,
      displayName: profile.displayName.trim(),
      username: profile.username.trim().toLowerCase(),
      bio: profile.bio.trim(),
      modelIds,
      models: modelIds,
      interests,
      updatedAt: new Date().toISOString(),
    };
    return localStorageDriver.setItem(STORAGE_KEYS.USER_PROFILE, payload);
  }

  async resetProfile(): Promise<UserProfile> {
    const defaultCopy = { ...DEFAULT_USER_PROFILE, updatedAt: new Date().toISOString() };
    localStorageDriver.setItem(STORAGE_KEYS.USER_PROFILE, defaultCopy);
    return defaultCopy;
  }
}

export const profileRepository = new LocalStorageProfileRepository();

