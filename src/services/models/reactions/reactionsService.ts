import { localStorageDriver, STORAGE_KEYS } from "../../storage/localStorageDriver";
import type { StorageDriver } from "../../storage/types";
import type { ModelReactions, ReactionType } from "../../../types/reactions";

export const CURATED_MOCK_REACTIONS: Record<string, ModelReactions> = {
  "google/gemini-2.5-flash": { fire: 284, slow: 41, clown: 29 },
  "google/gemini-2.5-pro": { fire: 390, slow: 62, clown: 25 },
  "google/gemini-2.0-flash-001": { fire: 310, slow: 15, clown: 12 },
  "google/gemini-1.5-flash": { fire: 245, slow: 18, clown: 15 },
  "google/gemini-1.5-pro": { fire: 215, slow: 54, clown: 21 },
  "anthropic/claude-3.7-sonnet": { fire: 492, slow: 18, clown: 24 },
  "anthropic/claude-3.5-sonnet": { fire: 480, slow: 20, clown: 22 },
  "anthropic/claude-3.5-haiku": { fire: 210, slow: 8, clown: 14 },
  "openai/gpt-4o": { fire: 340, slow: 22, clown: 35 },
  "openai/gpt-4o-mini": { fire: 295, slow: 9, clown: 18 },
  "openai/o1": { fire: 420, slow: 88, clown: 32 },
  "openai/o3-mini": { fire: 380, slow: 45, clown: 28 },
  "deepseek/deepseek-r1": { fire: 513, slow: 93, clown: 48 },
  "deepseek/deepseek-chat": { fire: 410, slow: 34, clown: 26 },
  "qwen/qwen-2.5-72b-instruct": { fire: 265, slow: 38, clown: 19 },
  "qwen/qwen-2.5-coder-32b-instruct": { fire: 310, slow: 22, clown: 15 },
  "qwen/qwen-2.5-7b-instruct": { fire: 91, slow: 14, clown: 8 },
  "meta-llama/llama-3.3-70b-instruct": { fire: 182, slow: 26, clown: 14 },
  "meta-llama/llama-3.1-405b-instruct": { fire: 230, slow: 110, clown: 31 },
  "meta-llama/llama-3.1-8b-instruct": { fire: 82, slow: 12, clown: 7 },
  "mistralai/mistral-large-2411": { fire: 145, slow: 19, clown: 11 },
  "mistralai/codestral-2501": { fire: 220, slow: 16, clown: 9 },
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export class ModelReactionsService {
  constructor(private storage: StorageDriver = localStorageDriver) {}

  getInitialCounts(modelId: string): ModelReactions {
    if (CURATED_MOCK_REACTIONS[modelId]) {
      return { ...CURATED_MOCK_REACTIONS[modelId] };
    }

    // Fallback to deterministic realistic counts
    const hash = hashString(modelId);
    const fire = 30 + (hash % 380);
    const slow = 4 + ((hash >> 3) % 60);
    const clown = 2 + ((hash >> 6) % 35);

    return { fire, slow, clown };
  }

  getAllUserReactions(): Record<string, ReactionType[]> {
    const stored = this.storage.getItem<Record<string, ReactionType[]>>(
      STORAGE_KEYS.MODEL_REACTIONS,
    );
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      return stored;
    }
    return {};
  }

  getUserReactions(modelId: string): ReactionType[] {
    const all = this.getAllUserReactions();
    return all[modelId] || [];
  }

  saveUserReactions(all: Record<string, ReactionType[]>): boolean {
    return this.storage.setItem(STORAGE_KEYS.MODEL_REACTIONS, all);
  }

  getEffectiveCounts(
    modelId: string,
    userReactions?: ReactionType[],
  ): ModelReactions {
    const base = this.getInitialCounts(modelId);
    const active = userReactions ?? this.getUserReactions(modelId);

    return {
      fire: base.fire + (active.includes("fire") ? 1 : 0),
      slow: base.slow + (active.includes("slow") ? 1 : 0),
      clown: base.clown + (active.includes("clown") ? 1 : 0),
    };
  }

  toggleUserReaction(
    modelId: string,
    type: ReactionType,
  ): { userReactions: ReactionType[]; counts: ModelReactions } {
    const all = this.getAllUserReactions();
    const current = all[modelId] || [];
    const exists = current.includes(type);

    const nextReactions = exists
      ? current.filter((t) => t !== type)
      : [...current, type];

    if (nextReactions.length === 0) {
      delete all[modelId];
    } else {
      all[modelId] = nextReactions;
    }

    this.saveUserReactions(all);

    const counts = this.getEffectiveCounts(modelId, nextReactions);
    return { userReactions: nextReactions, counts };
  }
}

export const modelReactionsService = new ModelReactionsService();

export const getInitialCounts = (modelId: string) =>
  modelReactionsService.getInitialCounts(modelId);
export const getAllUserReactions = () =>
  modelReactionsService.getAllUserReactions();
export const getUserReactions = (modelId: string) =>
  modelReactionsService.getUserReactions(modelId);
export const saveUserReactions = (all: Record<string, ReactionType[]>) =>
  modelReactionsService.saveUserReactions(all);
export const getEffectiveCounts = (
  modelId: string,
  userReactions?: ReactionType[],
) => modelReactionsService.getEffectiveCounts(modelId, userReactions);
export const toggleUserReaction = (modelId: string, type: ReactionType) =>
  modelReactionsService.toggleUserReaction(modelId, type);
