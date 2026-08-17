import { describe, expect, it } from "vitest";
import {
  isLowerIsBetterBenchmark,
  sortAndRankBenchmarkEntries,
  sortAndRankCategoryModels,
  sortAndRankOverviewModels,
  sortAndRankSpeedEntries,
} from "./benchmarkRanking";
import type {
  Benchmark,
  BenchmarkLeaderboardEntry,
  CategoryModelEntry,
  OverviewModelEntry,
  SpeedLeaderboardEntry,
} from "./types";

describe("benchmarkRanking", () => {
  describe("isLowerIsBetterBenchmark", () => {
    it("detects lower-is-better benchmarks from metadata, format, or descriptions", () => {
      expect(
        isLowerIsBetterBenchmark({
          name: "VoxPopuli WER",
          format: "Word error rate",
          description: "speech recognition reported as word error rate where lower is better",
        }),
      ).toBe(true);

      expect(
        isLowerIsBetterBenchmark({
          name: "Factuality hallucination rate",
          format: "Hallucination rate",
        }),
      ).toBe(true);

      expect(
        isLowerIsBetterBenchmark({
          name: "Market-Bench",
          format: "Backtester implementation scored by mean absolute error",
        }),
      ).toBe(true);

      expect(
        isLowerIsBetterBenchmark({
          name: "Conceptual Reasoning",
          format: "Average pairwise-ranking loss against expert ratings",
        }),
      ).toBe(true);

      expect(
        isLowerIsBetterBenchmark({
          name: "Explicit Low Metric",
          higherIsBetter: false,
        }),
      ).toBe(true);

      expect(
        isLowerIsBetterBenchmark({
          name: "Custom Direction",
          direction: "asc",
        }),
      ).toBe(true);
    });

    it("returns false for standard higher-is-better benchmarks", () => {
      expect(
        isLowerIsBetterBenchmark({
          name: "SWE-bench Verified",
          format: "Pass@1",
          description: "Resolved rate on real-world GitHub issues.",
        }),
      ).toBe(false);

      expect(
        isLowerIsBetterBenchmark({
          name: "GPQA Diamond",
          format: "Multiple choice accuracy",
        }),
      ).toBe(false);

      expect(
        isLowerIsBetterBenchmark({
          name: "BioMysteryBench (human-solvable)",
          format: "Task score",
          description: "Computational biology challenges that independent human experts were able to solve.",
        }),
      ).toBe(false);

      expect(isLowerIsBetterBenchmark(null)).toBe(false);
    });
  });

  describe("sortAndRankOverviewModels", () => {
    const mockOverview: OverviewModelEntry[] = [
      {
        modelKey: "model-low-score-high-cov",
        modelName: "Model LowScore HighCov",
        displayScore: 52.1,
        coverageCount: 100,
        totalBenchmarksCount: 100,
        categoryScores: {},
      },
      {
        modelKey: "model-high-score-low-cov",
        modelName: "Model HighScore LowCov",
        displayScore: 82.7,
        coverageCount: 5,
        totalBenchmarksCount: 100,
        categoryScores: {},
      },
      {
        modelKey: "model-same-score-b",
        modelName: "Beta Model SameScore",
        displayScore: 70.0,
        coverageCount: 20,
        totalBenchmarksCount: 100,
        categoryScores: {},
      },
      {
        modelKey: "model-same-score-a",
        modelName: "Alpha Model SameScore",
        displayScore: 70.0,
        coverageCount: 20,
        totalBenchmarksCount: 100,
        categoryScores: {},
      },
      {
        modelKey: "model-no-score",
        modelName: "Unranked Model",
        displayScore: undefined,
        coverageCount: 50,
        totalBenchmarksCount: 100,
        categoryScores: {},
      },
    ];

    it("sorts primarily by Score DESC, putting high score before low score regardless of coverage", () => {
      const sorted = sortAndRankOverviewModels(mockOverview, { sortBy: "score", direction: "desc" });

      expect(sorted[0].modelKey).toBe("model-high-score-low-cov"); // 82.7
      expect(sorted[0].displayScore).toBe(82.7);
      expect(sorted[1].displayScore).toBe(70.0);
      expect(sorted[2].displayScore).toBe(70.0);
      expect(sorted[3].displayScore).toBe(52.1);
      expect(sorted[4].modelKey).toBe("model-no-score"); // undefined score pushed to bottom
    });

    it("tie-breaks equal scores deterministically by coverage DESC, then by modelName ASC", () => {
      const sorted = sortAndRankOverviewModels(mockOverview, { sortBy: "score", direction: "desc" });
      const sameScores = sorted.filter((m) => m.displayScore === 70.0);
      expect(sameScores[0].modelName).toBe("Alpha Model SameScore");
      expect(sameScores[1].modelName).toBe("Beta Model SameScore");
    });

    it("supports sorting by coverage", () => {
      const sorted = sortAndRankOverviewModels(mockOverview, { sortBy: "coverage", direction: "desc" });
      expect(sorted[0].modelKey).toBe("model-low-score-high-cov"); // coverage 100
      expect(sorted[0].coverageCount).toBe(100);
      expect(sorted[1].modelKey).toBe("model-no-score"); // coverage 50
    });

    it("filters by search query while maintaining sorted order", () => {
      const sorted = sortAndRankOverviewModels(mockOverview, { query: "SameScore" });
      expect(sorted.length).toBe(2);
      expect(sorted[0].modelName).toBe("Alpha Model SameScore");
      expect(sorted[1].modelName).toBe("Beta Model SameScore");
    });
  });

  describe("sortAndRankCategoryModels", () => {
    const mockCategory: CategoryModelEntry[] = [
      {
        modelKey: "claude-mythos",
        modelName: "Claude Mythos 5",
        categoryScore: 82.7,
        categoryCoverageCount: 3,
        totalCategoryBenchmarks: 10,
      },
      {
        modelKey: "gpt-terra",
        modelName: "GPT-5.6 Terra",
        categoryScore: 52.1,
        categoryCoverageCount: 10,
        totalCategoryBenchmarks: 10,
      },
      {
        modelKey: "claude-opus",
        modelName: "Claude Opus 4.8",
        categoryScore: 68.8,
        categoryCoverageCount: 7,
        totalCategoryBenchmarks: 10,
      },
      {
        modelKey: "no-score-model",
        modelName: "Zero Score Model",
        categoryScore: undefined,
        categoryCoverageCount: 4,
        totalCategoryBenchmarks: 10,
      },
    ];

    it("ranks 82.7 above 68.8 and 52.1 in category view", () => {
      const sorted = sortAndRankCategoryModels(mockCategory, { sortBy: "score", direction: "desc" });

      expect(sorted[0].modelKey).toBe("claude-mythos"); // 82.7
      expect(sorted[1].modelKey).toBe("claude-opus"); // 68.8
      expect(sorted[2].modelKey).toBe("gpt-terra"); // 52.1
      expect(sorted[3].modelKey).toBe("no-score-model"); // undefined
    });

    it("sorts by category coverage when requested", () => {
      const sorted = sortAndRankCategoryModels(mockCategory, { sortBy: "coverage", direction: "desc" });
      expect(sorted[0].modelKey).toBe("gpt-terra"); // coverage 10
      expect(sorted[1].modelKey).toBe("claude-opus"); // coverage 7
    });
  });

  describe("sortAndRankBenchmarkEntries", () => {
    const mockLeaderboard: BenchmarkLeaderboardEntry[] = [
      { rank: 0, modelKey: "model-a", modelName: "Model A", score: 65.5 },
      { rank: 0, modelKey: "model-b", modelName: "Model B", score: 92.1 },
      { rank: 0, modelKey: "model-c", modelName: "Model C", score: 40.0 },
      { rank: 0, modelKey: "model-d", modelName: "Model D", score: 65.5 },
    ];

    it("sorts standard higher-is-better benchmark descending and assigns ranks #1..#N", () => {
      const benchmark: Benchmark = {
        id: "sweVerified",
        name: "SWE-bench Verified",
        category: "coding",
        categoryLabel: "Coding",
        resultCount: 4,
      };

      const ranked = sortAndRankBenchmarkEntries(mockLeaderboard, benchmark);
      expect(ranked[0].modelKey).toBe("model-b"); // 92.1
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].modelKey).toBe("model-a"); // 65.5 (alphabetical Model A before Model D)
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].modelKey).toBe("model-d"); // 65.5
      expect(ranked[2].rank).toBe(3);
      expect(ranked[3].modelKey).toBe("model-c"); // 40.0
      expect(ranked[3].rank).toBe(4);
    });

    it("sorts lower-is-better benchmark (e.g. WER/Hallucination) ascending by default", () => {
      const werBenchmark: Benchmark = {
        id: "voxPopuliWer",
        name: "VoxPopuli WER",
        format: "Word error rate",
        category: "multimodalGrounded",
        categoryLabel: "Multimodal & Grounded",
        resultCount: 4,
      };

      const werLeaderboard: BenchmarkLeaderboardEntry[] = [
        { rank: 0, modelKey: "m-high-err", modelName: "High Error Model", score: 12.4 },
        { rank: 0, modelKey: "m-low-err", modelName: "Low Error Model", score: 1.8 },
        { rank: 0, modelKey: "m-mid-err", modelName: "Mid Error Model", score: 5.2 },
      ];

      const ranked = sortAndRankBenchmarkEntries(werLeaderboard, werBenchmark);
      expect(ranked[0].modelKey).toBe("m-low-err"); // 1.8 is best
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].modelKey).toBe("m-mid-err"); // 5.2
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].modelKey).toBe("m-high-err"); // 12.4
      expect(ranked[2].rank).toBe(3);
    });
  });

  describe("sortAndRankSpeedEntries", () => {
    const mockSpeed: SpeedLeaderboardEntry[] = [
      { rank: 0, modelKey: "m1", modelName: "Model 1", tokensPerSecond: 120, ttft: 0.8 },
      { rank: 0, modelKey: "m2", modelName: "Model 2", tokensPerSecond: 300, ttft: 0.4 },
      { rank: 0, modelKey: "m3", modelName: "Model 3", tokensPerSecond: 300, ttft: 0.2 },
      { rank: 0, modelKey: "m4", modelName: "Model 4", tokensPerSecond: 80, ttft: 1.5 },
    ];

    it("sorts speed by tokensPerSecond DESC with TTFT ASC as tie-breaker", () => {
      const ranked = sortAndRankSpeedEntries(mockSpeed, { sortBy: "speed", direction: "desc" });
      expect(ranked[0].modelKey).toBe("m3"); // 300 t/s, TTFT 0.2
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].modelKey).toBe("m2"); // 300 t/s, TTFT 0.4
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].modelKey).toBe("m1"); // 120 t/s
      expect(ranked[2].rank).toBe(3);
      expect(ranked[3].modelKey).toBe("m4"); // 80 t/s
      expect(ranked[3].rank).toBe(4);
    });

    it("sorts speed by latency (TTFT) ASC with tokensPerSecond DESC as tie-breaker", () => {
      const ranked = sortAndRankSpeedEntries(mockSpeed, { sortBy: "latency", direction: "asc" });
      expect(ranked[0].modelKey).toBe("m3"); // TTFT 0.2
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].modelKey).toBe("m2"); // TTFT 0.4
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].modelKey).toBe("m1"); // TTFT 0.8
      expect(ranked[2].rank).toBe(3);
      expect(ranked[3].modelKey).toBe("m4"); // TTFT 1.5
      expect(ranked[3].rank).toBe(4);
    });
  });
});
