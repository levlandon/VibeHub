export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio: string;
  modelIds: string[];
  interests: string[];
  // Compatibility aliases
  avatar?: string;
  models?: string[];
  updatedAt?: string;
}

export type ProfileUpdate = Partial<Omit<UserProfile, "id">>;

export type AiStackCategory = "agents" | "models" | "tools";

export interface AiStackItem {
  id: string;
  name: string;
  category: AiStackCategory;
  description?: string;
  provider?: string;
  icon?: string;
  badge?: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof UserProfile, string>>;
  /** Stable i18n keys for UI consumers; errors remain for service compatibility. */
  errorKeys?: Partial<Record<keyof UserProfile, string>>;
}
