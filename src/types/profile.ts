export interface UserProfile {
  avatar: string;
  displayName: string;
  username: string;
  bio: string;
  models: string[];
  interests: string[];
  codingAgents?: string[];
  tools?: string[];
  updatedAt?: string;
}

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
}
