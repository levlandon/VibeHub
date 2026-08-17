import { describe, expect, it } from "vitest";
import type { Model } from "../../types/models";
import { BenchmarkService } from "./benchmarkService";
import { matchBenchmarkToModel, normalizeProvider } from "./modelMatcher";
import type { BenchmarkProvider, BenchmarkProviderData } from "./types";

const mockModels: Model[] = [
  {
    id: "anthropic/claude-3.7-sonnet",
    slug: "claude-3-7-sonnet",
    name: "Anthropic: Claude 3.7 Sonnet",
    provider: "Anthropic",
    providerId: "anthropic",
    contextLength: 200000,
    contextWindow: "200K",
    pricing: {
      prompt: 0.000003,
      completion: 0.000015,
      promptPerMillion: 3,
      completionPerMillion: 15,
      isFree: false,
      formattedSummary: "$3.00 / $15.00",
    },
    capabilities: ["Reasoning", "Vision"],
    source: "openrouter",
  },
  {
    id: "google/gemini-2.5-pro",
    slug: "gemini-2-5-pro",
    name: "Google: Gemini 2.5 Pro",
    provider: "Google",
    providerId: "google",
    contextLength: 1000000,
    contextWindow: "1M",
    pricing: {
      prompt: 0.00000125,
      completion: 0.000005,
      promptPerMillion: 1.25,
      completionPerMillion: 5,
      isFree: false,
      formattedSummary: "$1.25 / $5.00",
    },
    capabilities: ["Reasoning", "Vision"],
    source: "openrouter",
  },
  {
    id: "google/gemini-2.5-flash",
    slug: "gemini-2-5-flash",
    name: "Google: Gemini 2.5 Flash",
    provider: "Google",
    providerId: "google",
    contextLength: 1000000,
    contextWindow: "1M",
    pricing: {
      prompt: 0.0000001,
      completion: 0.0000004,
      promptPerMillion: 0.1,
      completionPerMillion: 0.4,
      isFree: false,
      formattedSummary: "$0.10 / $0.40",
    },
    capabilities: ["Vision"],
    source: "openrouter",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    slug: "llama-3-3-70b-instruct",
    name: "Meta: Llama 3.3 70B Instruct",
    provider: "Meta",
    providerId: "meta-llama",
    contextLength: 128000,
    contextWindow: "128K",
    pricing: {
      prompt: 0,
      completion: 0,
      promptPerMillion: 0,
      completionPerMillion: 0,
      isFree: true,
      formattedSummary: "Бесплатно",
    },
    capabilities: ["Tools"],
    source: "openrouter",
  },
  {
    id: "deepseek/deepseek-r1",
    slug: "deepseek-r1",
    name: "DeepSeek: DeepSeek R1",
    provider: "DeepSeek",
    providerId: "deepseek",
    contextLength: 64000,
    contextWindow: "64K",
    pricing: {
      prompt: 0.00000055,
      completion: 0.00000219,
      promptPerMillion: 0.55,
      completionPerMillion: 2.19,
      isFree: false,
      formattedSummary: "$0.55 / $2.19",
    },
    capabilities: ["Reasoning"],
    source: "openrouter",
  },
];

const mockProviderData: BenchmarkProviderData = {
  benchmarks: [
    {
      id: "sweVerified",
      name: "SWE-bench Verified",
      fullName: "SWE-bench Verified (Resolved Rate)",
      category: "coding",
      categoryLabel: "Coding",
      description: "Resolved rate on real-world GitHub issues verified by human annotators.",
      paperUrl: "https://arxiv.org/abs/2406.06608",
      resultCount: 2,
    },
    {
      id: "gpqa",
      name: "GPQA Diamond",
      fullName: "Google-Proof Q&A Diamond",
      category: "knowledge",
      categoryLabel: "Knowledge",
      description: "Expert-level biology, chemistry, and physics questions.",
      resultCount: 2,
    },
  ],
  categories: [
    { id: "coding", label: "Coding" },
    { id: "knowledge", label: "Knowledge" },
  ],
  models: [
    {
      slug: "claude-3-7-sonnet",
      canonicalModelKey: "claude-3-7-sonnet",
      model: "Claude 3.7 Sonnet",
      creator: "Anthropic",
      benchmarks: {
        coding: {
          sweVerified: 70.3,
        },
        knowledge: {
          gpqa: 65.2,
        },
      },
    },
    {
      slug: "gemini-2-5-pro",
      canonicalModelKey: "gemini-2-5-pro",
      model: "Gemini 2.5 Pro",
      creator: "Google",
      benchmarks: {
        coding: {
          sweVerified: 63.8,
        },
        knowledge: {
          gpqa: 72.1,
        },
      },
    },
  ],
  speedItems: [
    {
      rank: 1,
      modelKey: "gemini-2-5-flash",
      modelName: "Gemini 2.5 Flash",
      creator: "Google",
      tokensPerSecond: 280,
      ttft: 0.45,
      source: "Artificial Analysis",
      sourceUrl: "https://artificialanalysis.ai",
    },
    {
      rank: 2,
      modelKey: "claude-3-7-sonnet",
      modelName: "Claude 3.7 Sonnet",
      creator: "Anthropic",
      tokensPerSecond: 85,
      ttft: 1.2,
      source: "Artificial Analysis",
      sourceUrl: "https://artificialanalysis.ai",
    },
  ],
  sourceMetadata: {
    name: "BenchLM Mirror",
  },
};

class MockProvider implements BenchmarkProvider {
  name = "MockProvider";
  async fetchData(): Promise<BenchmarkProviderData> {
    return mockProviderData;
  }
}

describe("modelMatcher", () => {
  it("normalizes provider names reliably", () => {
    expect(normalizeProvider("Anthropic")).toBe("anthropic");
    expect(normalizeProvider("Google")).toBe("google");
    expect(normalizeProvider("Meta")).toBe("meta");
    expect(normalizeProvider("Meta-Llama")).toBe("meta");
    expect(normalizeProvider("DeepSeek")).toBe("deepseek");
    expect(normalizeProvider("Alibaba")).toBe("qwen");
  });

  it("matches identical and normalized model names and keys", () => {
    const match1 = matchBenchmarkToModel(
      {
        modelKey: "claude-3-7-sonnet",
        modelName: "Claude 3.7 Sonnet",
        creator: "Anthropic",
      },
      mockModels,
    );
    expect(match1?.id).toBe("anthropic/claude-3.7-sonnet");

    const match2 = matchBenchmarkToModel(
      {
        modelKey: "deepseek-r1",
        modelName: "DeepSeek R1",
        creator: "DeepSeek",
      },
      mockModels,
    );
    expect(match2?.id).toBe("deepseek/deepseek-r1");
  });

  it("prevents false matching between Pro and Flash variants", () => {
    const flashMatch = matchBenchmarkToModel(
      {
        modelKey: "gemini-2-5-flash",
        modelName: "Gemini 2.5 Flash",
        creator: "Google",
      },
      mockModels,
    );
    expect(flashMatch?.id).toBe("google/gemini-2.5-flash");

    const proMatch = matchBenchmarkToModel(
      {
        modelKey: "gemini-2-5-pro",
        modelName: "Gemini 2.5 Pro",
        creator: "Google",
      },
      mockModels,
    );
    expect(proMatch?.id).toBe("google/gemini-2.5-pro");
  });

  it("does not match conflicting parameter sizes", () => {
    const candidate8b = matchBenchmarkToModel(
      {
        modelKey: "llama-3-3-8b-instruct",
        modelName: "Llama 3.3 8B Instruct",
        creator: "Meta",
      },
      mockModels,
    );
    expect(candidate8b).toBeNull();
  });

  it("returns null for unknown models without false positives", () => {
    const unknown = matchBenchmarkToModel(
      {
        modelKey: "unknown-future-model-99",
        modelName: "Future Model 99",
        creator: "SomeCompany",
      },
      mockModels,
    );
    expect(unknown).toBeNull();
  });
});

describe("BenchmarkService", () => {
  const service = new BenchmarkService([new MockProvider()]);

  it("returns benchmarks filtered by category and query", async () => {
    const all = await service.getBenchmarks({ forceRefresh: true });
    expect(all).toHaveLength(2);

    const coding = await service.getBenchmarks({ category: "coding" });
    expect(coding).toHaveLength(1);
    expect(coding[0].id).toBe("sweVerified");

    const search = await service.getBenchmarks({ query: "diamond" });
    expect(search).toHaveLength(1);
    expect(search[0].id).toBe("gpqa");
  });

  it("computes leaderboard with ranking and matched models", async () => {
    const lb = await service.getBenchmarkLeaderboard("sweVerified", mockModels);
    expect(lb).toHaveLength(2);
    expect(lb[0].rank).toBe(1);
    expect(lb[0].modelName).toBe("Claude 3.7 Sonnet");
    expect(lb[0].score).toBe(70.3);
    expect(lb[0].matchedModelId).toBe("anthropic/claude-3.7-sonnet");

    expect(lb[1].rank).toBe(2);
    expect(lb[1].modelName).toBe("Gemini 2.5 Pro");
    expect(lb[1].score).toBe(63.8);
    expect(lb[1].matchedModelId).toBe("google/gemini-2.5-pro");
  });

  it("retrieves model benchmark scores and speed metrics", async () => {
    const claudeModel = mockModels[0];
    const scores = await service.getModelBenchmarkScores(claudeModel);
    expect(scores).toHaveLength(2);
    expect(scores[0].score).toBe(70.3);

    const speed = await service.getModelSpeed(claudeModel);
    expect(speed).not.toBeNull();
    expect(speed?.tokensPerSecond).toBe(85);
  });

  it("returns overview models with coverage and matching", async () => {
    const overview = await service.getOverviewModels(mockModels);
    expect(overview).toHaveLength(2);
    expect(overview[0].coverageCount).toBeGreaterThan(0);
    expect(overview[0].matchedModelId).toBeDefined();
  });

  it("returns category summary with category models and benchmarks", async () => {
    const summary = await service.getCategorySummary("coding", mockModels);
    expect(summary).not.toBeNull();
    expect(summary?.categoryId).toBe("coding");
    expect(summary?.totalBenchmarks).toBe(1);
    expect(summary?.models).toHaveLength(2);
    expect(summary?.models[0].categoryCoverageCount).toBeGreaterThan(0);
  });
});
