import type {
  Benchmark,
  BenchmarkLeaderboardEntry,
  CategoryModelEntry,
  OverviewModelEntry,
  SpeedLeaderboardEntry,
} from "./types";

export type SortDirection = "asc" | "desc";
export type OverviewSortColumn = "score" | "coverage";
export type CategorySortColumn = "score" | "coverage";
export type BenchmarkSortColumn = "score";
export type SpeedSortColumn = "speed" | "latency";

/**
 * Checks if a benchmark is lower-is-better (e.g. WER, hallucination rate, loss, error rate).
 */
export function isLowerIsBetterBenchmark(
  benchmark?: {
    name?: string;
    fullName?: string;
    description?: string;
    format?: string;
    higherIsBetter?: boolean;
    direction?: string;
    sortDirection?: string;
  } | null,
): boolean {
  if (!benchmark) return false;

  // 1. Explicit metadata flags if provided by source
  if (benchmark.higherIsBetter === false) return true;
  if (
    benchmark.direction?.toLowerCase() === "asc" ||
    benchmark.sortDirection?.toLowerCase() === "asc"
  ) {
    return true;
  }

  // 2. Pattern matching against format, name, fullName, description
  const text = `${benchmark.name || ""} ${benchmark.fullName || ""} ${benchmark.format || ""} ${benchmark.description || ""}`.toLowerCase();

  if (text.includes("lower is better") || text.includes("lower-is-better")) {
    return true;
  }

  // Word/Character error rate, hallucination rate, MAE, ranking loss
  if (
    /\b(word error rate|wer|character error rate|cer|hallucination rate|error rate|mean absolute error|mae)\b/i.test(
      `${benchmark.name || ""} ${benchmark.fullName || ""} ${benchmark.format || ""}`,
    )
  ) {
    return true;
  }

  if (
    /\b(word error rate|hallucination rate|mean absolute error|pairwise-ranking loss)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Safe numeric helper: returns true only for valid finite numbers.
 */
function isValidNumber(val: unknown): val is number {
  return typeof val === "number" && !isNaN(val) && isFinite(val);
}

/**
 * Stable string comparator with base sensitivity.
 */
function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base", numeric: true });
}

// ============================================================================
// OVERVIEW RANKING & SORTING
// ============================================================================

export interface OverviewSortOptions {
  sortBy?: OverviewSortColumn;
  direction?: SortDirection;
  query?: string;
}

export function sortAndRankOverviewModels(
  models: OverviewModelEntry[],
  options?: OverviewSortOptions,
): OverviewModelEntry[] {
  const { sortBy = "score", direction = "desc", query = "" } = options || {};
  const q = query.trim().toLowerCase();

  const filtered = q
    ? models.filter(
        (m) =>
          m.modelName.toLowerCase().includes(q) ||
          (m.provider && m.provider.toLowerCase().includes(q)) ||
          (m.creator && m.creator.toLowerCase().includes(q)),
      )
    : [...models];

  filtered.sort((a, b) => {
    if (sortBy === "coverage") {
      const aCov = a.coverageCount;
      const bCov = b.coverageCount;
      if (aCov !== bCov) {
        return direction === "asc" ? aCov - bCov : bCov - aCov;
      }
      // Tie-break: displayScore DESC -> modelName ASC
      const aScore = isValidNumber(a.displayScore) ? a.displayScore : -Infinity;
      const bScore = isValidNumber(b.displayScore) ? b.displayScore : -Infinity;
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return compareNames(a.modelName, b.modelName);
    }

    // Default: sortBy === "score"
    const aHasScore = isValidNumber(a.displayScore);
    const bHasScore = isValidNumber(b.displayScore);

    // Missing scores always go to the bottom
    if (aHasScore && !bHasScore) return -1;
    if (!aHasScore && bHasScore) return 1;

    if (aHasScore && bHasScore) {
      const diff = a.displayScore! - b.displayScore!;
      if (diff !== 0) {
        return direction === "asc" ? diff : -diff;
      }
    }

    // Tie-break: coverageCount DESC -> modelName ASC
    if (a.coverageCount !== b.coverageCount) {
      return b.coverageCount - a.coverageCount;
    }
    return compareNames(a.modelName, b.modelName);
  });

  return filtered;
}

// ============================================================================
// CATEGORY RANKING & SORTING
// ============================================================================

export interface CategorySortOptions {
  sortBy?: CategorySortColumn;
  direction?: SortDirection;
  query?: string;
}

export function sortAndRankCategoryModels(
  models: CategoryModelEntry[],
  options?: CategorySortOptions,
): CategoryModelEntry[] {
  const { sortBy = "score", direction = "desc", query = "" } = options || {};
  const q = query.trim().toLowerCase();

  const filtered = q
    ? models.filter(
        (m) =>
          m.modelName.toLowerCase().includes(q) ||
          (m.provider && m.provider.toLowerCase().includes(q)) ||
          (m.creator && m.creator.toLowerCase().includes(q)),
      )
    : [...models];

  filtered.sort((a, b) => {
    if (sortBy === "coverage") {
      const aCov = a.categoryCoverageCount;
      const bCov = b.categoryCoverageCount;
      if (aCov !== bCov) {
        return direction === "asc" ? aCov - bCov : bCov - aCov;
      }
      // Tie-break: categoryScore DESC -> modelName ASC
      const aScore = isValidNumber(a.categoryScore) ? a.categoryScore : -Infinity;
      const bScore = isValidNumber(b.categoryScore) ? b.categoryScore : -Infinity;
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return compareNames(a.modelName, b.modelName);
    }

    // Default: sortBy === "score"
    const aHasScore = isValidNumber(a.categoryScore);
    const bHasScore = isValidNumber(b.categoryScore);

    // Missing scores always go to the bottom
    if (aHasScore && !bHasScore) return -1;
    if (!aHasScore && bHasScore) return 1;

    if (aHasScore && bHasScore) {
      const diff = a.categoryScore! - b.categoryScore!;
      if (diff !== 0) {
        return direction === "asc" ? diff : -diff;
      }
    }

    // Tie-break: categoryCoverageCount DESC -> modelName ASC
    if (a.categoryCoverageCount !== b.categoryCoverageCount) {
      return b.categoryCoverageCount - a.categoryCoverageCount;
    }
    return compareNames(a.modelName, b.modelName);
  });

  return filtered;
}

// ============================================================================
// BENCHMARK RANKING & SORTING
// ============================================================================

export interface BenchmarkSortOptions {
  direction?: SortDirection;
  query?: string;
}

export function sortAndRankBenchmarkEntries(
  entries: BenchmarkLeaderboardEntry[],
  benchmark?: Benchmark | null,
  options?: BenchmarkSortOptions,
): BenchmarkLeaderboardEntry[] {
  const isLower = isLowerIsBetterBenchmark(benchmark);
  const defaultDir: SortDirection = isLower ? "asc" : "desc";
  const { direction = defaultDir, query = "" } = options || {};
  const q = query.trim().toLowerCase();

  const filtered = q
    ? entries.filter(
        (e) =>
          e.modelName.toLowerCase().includes(q) ||
          (e.provider && e.provider.toLowerCase().includes(q)) ||
          (e.creator && e.creator.toLowerCase().includes(q)),
      )
    : [...entries];

  filtered.sort((a, b) => {
    const aHasScore = isValidNumber(a.score);
    const bHasScore = isValidNumber(b.score);

    if (aHasScore && !bHasScore) return -1;
    if (!aHasScore && bHasScore) return 1;

    if (aHasScore && bHasScore) {
      const diff = a.score - b.score;
      if (diff !== 0) {
        return direction === "asc" ? diff : -diff;
      }
    }

    return compareNames(a.modelName, b.modelName);
  });

  // Assign sequential local ranks
  return filtered.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

// ============================================================================
// SPEED RANKING & SORTING
// ============================================================================

export interface SpeedSortOptions {
  sortBy?: SpeedSortColumn;
  direction?: SortDirection;
  query?: string;
}

export function sortAndRankSpeedEntries(
  entries: SpeedLeaderboardEntry[],
  options?: SpeedSortOptions,
): SpeedLeaderboardEntry[] {
  const { sortBy = "speed", query = "" } = options || {};
  const defaultDir: SortDirection = sortBy === "latency" ? "asc" : "desc";
  const { direction = defaultDir } = options || {};
  const q = query.trim().toLowerCase();

  const filtered = q
    ? entries.filter(
        (s) =>
          s.modelName.toLowerCase().includes(q) ||
          (s.provider && s.provider.toLowerCase().includes(q)) ||
          (s.creator && s.creator.toLowerCase().includes(q)),
      )
    : [...entries];

  filtered.sort((a, b) => {
    if (sortBy === "latency") {
      const aHasTtft = isValidNumber(a.ttft);
      const bHasTtft = isValidNumber(b.ttft);

      if (aHasTtft && !bHasTtft) return -1;
      if (!aHasTtft && bHasTtft) return 1;

      if (aHasTtft && bHasTtft) {
        const diff = a.ttft! - b.ttft!;
        if (diff !== 0) {
          return direction === "asc" ? diff : -diff;
        }
      }

      // Tie-break: speed DESC -> modelName ASC
      if (a.tokensPerSecond !== b.tokensPerSecond) {
        return b.tokensPerSecond - a.tokensPerSecond;
      }
      return compareNames(a.modelName, b.modelName);
    }

    // Default: sortBy === "speed"
    const aSpeed = isValidNumber(a.tokensPerSecond) ? a.tokensPerSecond : -Infinity;
    const bSpeed = isValidNumber(b.tokensPerSecond) ? b.tokensPerSecond : -Infinity;

    if (aSpeed !== bSpeed) {
      return direction === "asc" ? aSpeed - bSpeed : bSpeed - aSpeed;
    }

    // Tie-break: ttft ASC (lower latency is better) -> modelName ASC
    const aTtft = isValidNumber(a.ttft) ? a.ttft : Infinity;
    const bTtft = isValidNumber(b.ttft) ? b.ttft : Infinity;
    if (aTtft !== bTtft) {
      return aTtft - bTtft;
    }

    return compareNames(a.modelName, b.modelName);
  });

  return filtered.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}
