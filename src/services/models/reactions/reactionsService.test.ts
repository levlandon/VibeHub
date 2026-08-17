import { beforeEach, describe, expect, it } from "vitest";
import { ModelReactionsService } from "./reactionsService";
import type { StorageDriver } from "../../storage/types";

class MemoryStorageDriver implements StorageDriver {
  private store = new Map<string, string>();

  getItem<T>(key: string): T | null {
    const val = this.store.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  }

  setItem<T>(key: string, value: T): boolean {
    this.store.set(key, JSON.stringify(value));
    return true;
  }

  removeItem(key: string): boolean {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

describe("ModelReactionsService", () => {
  let memoryStorage: MemoryStorageDriver;
  let service: ModelReactionsService;

  beforeEach(() => {
    memoryStorage = new MemoryStorageDriver();
    service = new ModelReactionsService(memoryStorage);
  });

  it("returns varied and deterministic initial counts for models", () => {
    const gemini = service.getInitialCounts("google/gemini-2.5-flash");
    const claude = service.getInitialCounts("anthropic/claude-3.7-sonnet");
    const deepseek = service.getInitialCounts("deepseek/deepseek-r1");
    const qwen = service.getInitialCounts("qwen/qwen-2.5-7b-instruct");
    const custom = service.getInitialCounts("random-org/some-unknown-model-123");

    expect(gemini.fire).toBe(284);
    expect(gemini.slow).toBe(41);
    expect(gemini.clown).toBe(29);

    expect(claude.fire).toBe(492);
    expect(deepseek.fire).toBe(513);
    expect(qwen.fire).toBe(91);

    expect(custom.fire).toBeGreaterThan(0);
    expect(custom.slow).toBeGreaterThan(0);
    expect(custom.clown).toBeGreaterThan(0);

    // Initial counts are distinct
    expect(gemini.fire).not.toBe(qwen.fire);
  });

  it("toggles a reaction on and updates effective count", () => {
    const modelId = "google/gemini-2.5-flash";
    const initial = service.getInitialCounts(modelId);

    const { userReactions, counts } = service.toggleUserReaction(modelId, "fire");

    expect(userReactions).toEqual(["fire"]);
    expect(counts.fire).toBe(initial.fire + 1);
    expect(counts.slow).toBe(initial.slow);
    expect(counts.clown).toBe(initial.clown);
    expect(service.getUserReactions(modelId)).toEqual(["fire"]);
  });

  it("toggles a reaction off on second click and decrements count", () => {
    const modelId = "google/gemini-2.5-flash";
    const initial = service.getInitialCounts(modelId);

    service.toggleUserReaction(modelId, "fire");
    const { userReactions, counts } = service.toggleUserReaction(modelId, "fire");

    expect(userReactions).toEqual([]);
    expect(counts.fire).toBe(initial.fire);
    expect(service.getUserReactions(modelId)).toEqual([]);
  });

  it("allows setting multiple reaction types on the same model", () => {
    const modelId = "anthropic/claude-3.7-sonnet";
    const initial = service.getInitialCounts(modelId);

    service.toggleUserReaction(modelId, "fire");
    const { userReactions, counts } = service.toggleUserReaction(modelId, "slow");

    expect(userReactions).toEqual(["fire", "slow"]);
    expect(counts.fire).toBe(initial.fire + 1);
    expect(counts.slow).toBe(initial.slow + 1);
    expect(counts.clown).toBe(initial.clown);
  });

  it("persists user reactions in storage and restores them", () => {
    service.saveUserReactions({
      "openai/gpt-4o": ["fire", "clown"],
    });

    const userReactions = service.getUserReactions("openai/gpt-4o");
    expect(userReactions).toEqual(["fire", "clown"]);

    const counts = service.getEffectiveCounts("openai/gpt-4o");
    const initial = service.getInitialCounts("openai/gpt-4o");
    expect(counts.fire).toBe(initial.fire + 1);
    expect(counts.slow).toBe(initial.slow);
    expect(counts.clown).toBe(initial.clown + 1);
  });

  it("cleans up model entry in storage when all reactions are removed", () => {
    const modelId = "meta-llama/llama-3.3-70b-instruct";
    service.toggleUserReaction(modelId, "fire");
    expect(service.getAllUserReactions()[modelId]).toEqual(["fire"]);

    service.toggleUserReaction(modelId, "fire");
    expect(service.getAllUserReactions()[modelId]).toBeUndefined();
  });

  it("handles empty or corrupt data gracefully in storage", () => {
    memoryStorage.setItem("vibehub.model.reactions", "not-a-json-object");
    expect(service.getAllUserReactions()).toEqual({});
    expect(service.getUserReactions("google/gemini-2.5-flash")).toEqual([]);
  });
});
