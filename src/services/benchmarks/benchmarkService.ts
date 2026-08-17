import type { Model } from "../../types/models";
import { BenchLMirrorProvider } from "./benchLMirrorProvider";
import { matchBenchmarkToModel } from "./modelMatcher";
import {
  isLowerIsBetterBenchmark,
  sortAndRankBenchmarkEntries,
  sortAndRankCategoryModels,
  sortAndRankOverviewModels,
  sortAndRankSpeedEntries,
} from "./benchmarkRanking";
import type {
  Benchmark,
  BenchmarkCategoryInfo,
  BenchmarkLeaderboardEntry,
  BenchmarkProvider,
  BenchmarkProviderData,
  CategoryModelEntry,
  CategorySummary,
  ModelBenchmarkScore,
  ModelSpeedMetric,
  OverviewModelEntry,
  RawBenchLMModel,
  SpeedLeaderboardEntry,
} from "./types";


const CACHE_KEY = "vibehub-benchmarks-cache-v1";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CachedBenchmarksData {
  timestamp: number;
  data: BenchmarkProviderData;
}

export class BenchmarkService {
  private providers: BenchmarkProvider[];
  private memoryCache: CachedBenchmarksData | null = null;
  private inFlightPromise: Promise<BenchmarkProviderData> | null = null;

  constructor(defaultProviders: BenchmarkProvider[] = [new BenchLMirrorProvider()]) {
    this.providers = defaultProviders;
  }

  registerProvider(provider: BenchmarkProvider): void {
    this.providers.push(provider);
  }

  async getData(options?: { forceRefresh?: boolean }): Promise<BenchmarkProviderData> {
    if (!options?.forceRefresh) {
      if (this.memoryCache && Date.now() - this.memoryCache.timestamp < CACHE_TTL_MS) {
        return this.memoryCache.data;
      }

      const sessionCached = this.loadSessionCache();
      if (sessionCached) {
        this.memoryCache = sessionCached;
        return sessionCached.data;
      }
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = this.fetchFromProviders()
      .then((data) => {
        const cached: CachedBenchmarksData = {
          timestamp: Date.now(),
          data,
        };
        this.memoryCache = cached;
        this.saveSessionCache(cached);
        return data;
      })
      .finally(() => {
        this.inFlightPromise = null;
      });

    return this.inFlightPromise;
  }

  private async fetchFromProviders(): Promise<BenchmarkProviderData> {
    if (this.providers.length === 0) {
      throw new Error("No benchmark providers registered");
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const data = await provider.fetchData();
        if (data && (data.benchmarks.length > 0 || data.models.length > 0)) {
          return data;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Provider ${provider.name} failed:`, err);
      }
    }

    // Try stale fallback cache
    const stale = this.loadSessionCache(true);
    if (stale && stale.data) {
      return stale.data;
    }

    throw lastError || new Error("Не удалось загрузить данные бенчмарков");
  }

  async getBenchmarks(options?: {
    category?: string;
    query?: string;
    forceRefresh?: boolean;
  }): Promise<Benchmark[]> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });
    const { category = "all", query = "" } = options || {};
    const q = query.trim().toLowerCase();

    return data.benchmarks.filter((b) => {
      if (category !== "all" && b.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (q) {
        const searchable = `${b.name} ${b.fullName || ""} ${b.description || ""} ${b.categoryLabel}`.toLowerCase();
        if (!searchable.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  async getCategories(options?: { forceRefresh?: boolean }): Promise<BenchmarkCategoryInfo[]> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });
    return data.categories;
  }

  async getOverviewModels(
    openRouterModels: Model[] = [],
    options?: { query?: string; forceRefresh?: boolean },
  ): Promise<OverviewModelEntry[]> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });
    const q = options?.query?.trim().toLowerCase() || "";
    const totalBenchmarksCount = data.benchmarks.length;

    const entries: OverviewModelEntry[] = data.models
      .map((m) => {
        let coverageCount = 0;
        const catScores: Record<string, number> = {};

        if (m.benchmarks) {
          for (const catObj of Object.values(m.benchmarks)) {
            if (!catObj || typeof catObj !== "object") continue;
            for (const val of Object.values(catObj)) {
              if (typeof val === "number" && !isNaN(val)) {
                coverageCount++;
              }
            }
          }
        }

        if (m.scores?.displayCategoryScores) {
          for (const [cat, sc] of Object.entries(m.scores.displayCategoryScores)) {
            if (typeof sc === "number" && !isNaN(sc)) {
              catScores[cat] = sc;
            }
          }
        }

        const matched = matchBenchmarkToModel(
          {
            modelKey: m.canonicalModelKey,
            slug: m.slug,
            modelName: m.model,
            creator: m.creator,
          },
          openRouterModels,
        );

        return {
          modelKey: m.canonicalModelKey || m.slug || m.model,
          modelName: m.model,
          creator: m.creator,
          provider: matched?.provider || m.creator,
          overallRank: m.overallRank,
          displayScore: typeof m.displayScore === "number" && !isNaN(m.displayScore) ? m.displayScore : undefined,
          coverageCount,
          totalBenchmarksCount,
          categoryScores: catScores,
          matchedModelId: matched?.id,
          url: m.url,
        };
      })
      .filter((entry) => entry.coverageCount > 0);

    return sortAndRankOverviewModels(entries, { query: q });
  }

  async getCategorySummary(
    categoryId: string,
    openRouterModels: Model[] = [],
    options?: { forceRefresh?: boolean },
  ): Promise<CategorySummary | null> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });
    const normCat = categoryId.toLowerCase();

    const catBenchmarks = data.benchmarks
      .filter((b) => b.category.toLowerCase() === normCat)
      .sort((a, b) => b.resultCount - a.resultCount || a.name.localeCompare(b.name));

    if (catBenchmarks.length === 0) {
      return null;
    }

    const categoryLabel = catBenchmarks[0]?.categoryLabel || categoryId;
    const totalCatBenchmarks = catBenchmarks.length;

    const models: CategoryModelEntry[] = [];

    for (const m of data.models) {
      let catCoverage = 0;

      if (m.benchmarks) {
        // Check direct category key or all benchmark keys in this category
        const directCat = m.benchmarks[normCat] || m.benchmarks[categoryId];
        if (directCat && typeof directCat === "object") {
          for (const val of Object.values(directCat)) {
            if (typeof val === "number" && !isNaN(val)) {
              catCoverage++;
            }
          }
        } else {
          // Check if any benchmark of this category has a score
          for (const b of catBenchmarks) {
            for (const catObj of Object.values(m.benchmarks)) {
              if (catObj && typeof catObj === "object" && typeof catObj[b.id] === "number" && !isNaN(catObj[b.id])) {
                catCoverage++;
                break;
              }
            }
          }
        }
      }

      if (catCoverage > 0) {
        const matched = matchBenchmarkToModel(
          {
            modelKey: m.canonicalModelKey,
            slug: m.slug,
            modelName: m.model,
            creator: m.creator,
          },
          openRouterModels,
        );

        let catScore: number | undefined;
        if (m.scores?.displayCategoryScores && typeof m.scores.displayCategoryScores[normCat] === "number") {
          catScore = m.scores.displayCategoryScores[normCat] as number;
        }

        models.push({
          modelKey: m.canonicalModelKey || m.slug || m.model,
          modelName: m.model,
          creator: m.creator,
          provider: matched?.provider || m.creator,
          categoryCoverageCount: catCoverage,
          totalCategoryBenchmarks: totalCatBenchmarks,
          categoryScore: catScore,
          matchedModelId: matched?.id,
        });
      }
    }

    const sortedModels = sortAndRankCategoryModels(models);

    return {
      categoryId,
      categoryLabel,
      totalBenchmarks: totalCatBenchmarks,
      totalModels: sortedModels.length,
      models: sortedModels,
      benchmarks: catBenchmarks,
    };
  }

  async getBenchmarkDetail(
    benchmarkId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<Benchmark | null> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });
    const found = data.benchmarks.find(
      (b) => b.id.toLowerCase() === benchmarkId.toLowerCase(),
    );
    return found || null;
  }

  async getBenchmarkLeaderboard(
    benchmarkId: string,
    openRouterModels: Model[] = [],
    options?: { forceRefresh?: boolean },
  ): Promise<BenchmarkLeaderboardEntry[]> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });
    const benchmarkMeta = data.benchmarks.find(
      (b) => b.id.toLowerCase() === benchmarkId.toLowerCase(),
    );

    const rawEntries: BenchmarkLeaderboardEntry[] = [];
    const normId = benchmarkId.toLowerCase();

    for (const model of data.models) {
      if (!model.benchmarks) continue;

      let score: number | undefined;

      for (const catKey of Object.keys(model.benchmarks)) {
        const catObj = model.benchmarks[catKey];
        if (!catObj || typeof catObj !== "object") continue;

        for (const [bKey, val] of Object.entries(catObj)) {
          if (bKey.toLowerCase() === normId && typeof val === "number" && !isNaN(val)) {
            score = val;
            break;
          }
        }
        if (score !== undefined) break;
      }

      if (score !== undefined) {
        const modelKey = model.canonicalModelKey || model.slug || model.model;
        const matched = matchBenchmarkToModel(
          {
            modelKey,
            slug: model.slug,
            modelName: model.model,
            creator: model.creator,
          },
          openRouterModels,
        );

        rawEntries.push({
          rank: 0,
          modelKey,
          modelName: model.model,
          creator: model.creator,
          provider: matched?.provider || model.creator,
          score,
          sourceType: model.sourceType,
          contextWindowTokens: model.contextWindowTokens,
          url: model.url,
          matchedModelId: matched?.id,
        });
      }
    }

    return sortAndRankBenchmarkEntries(rawEntries, benchmarkMeta);
  }

  async getSpeedLeaderboard(
    openRouterModels: Model[] = [],
    options?: { forceRefresh?: boolean },
  ): Promise<SpeedLeaderboardEntry[]> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });

    const rawItems: SpeedLeaderboardEntry[] = data.speedItems.map((item) => {
      const matched = matchBenchmarkToModel(
        {
          modelKey: item.modelKey,
          modelName: item.modelName,
          creator: item.creator,
        },
        openRouterModels,
      );

      return {
        ...item,
        rank: 0,
        provider: matched?.provider || item.creator,
        matchedModelId: matched?.id,
      };
    });

    return sortAndRankSpeedEntries(rawItems);
  }

  async getModelBenchmarkScores(
    model: Model,
    options?: { forceRefresh?: boolean },
  ): Promise<ModelBenchmarkScore[]> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });
    const benchmarkMap = new Map(data.benchmarks.map((b) => [b.id.toLowerCase(), b]));

    // Find matching BenchLM model
    let targetBenchModel: RawBenchLMModel | null = null;
    for (const benchModel of data.models) {
      const matched = matchBenchmarkToModel(
        {
          modelKey: benchModel.canonicalModelKey,
          slug: benchModel.slug,
          modelName: benchModel.model,
          creator: benchModel.creator,
        },
        [model],
      );
      if (matched) {
        targetBenchModel = benchModel;
        break;
      }
    }

    if (!targetBenchModel || !targetBenchModel.benchmarks) {
      return [];
    }

    const scores: ModelBenchmarkScore[] = [];

    for (const [catKey, catBenchmarks] of Object.entries(targetBenchModel.benchmarks)) {
      if (!catBenchmarks || typeof catBenchmarks !== "object") continue;

      for (const [bKey, scoreVal] of Object.entries(catBenchmarks)) {
        if (typeof scoreVal !== "number" || isNaN(scoreVal)) continue;

        const bMeta = benchmarkMap.get(bKey.toLowerCase());
        scores.push({
          benchmarkId: bKey,
          benchmarkName: bMeta?.name || bKey,
          category: bMeta?.category || catKey,
          categoryLabel: bMeta?.categoryLabel || catKey,
          score: scoreVal,
          paperUrl: bMeta?.paperUrl,
          sourceUrl: bMeta?.url,
        });
      }
    }

    return scores.sort((a, b) => {
      const bMetaA = benchmarkMap.get(a.benchmarkId.toLowerCase());
      const isLowerA = isLowerIsBetterBenchmark(bMetaA);
      const bMetaB = benchmarkMap.get(b.benchmarkId.toLowerCase());
      const isLowerB = isLowerIsBetterBenchmark(bMetaB);

      // If both same direction, sort accordingly
      if (isLowerA === isLowerB) {
        const diff = isLowerA ? a.score - b.score : b.score - a.score;
        if (diff !== 0) return diff;
      } else {
        // Standard score higher first
        const diff = b.score - a.score;
        if (diff !== 0) return diff;
      }
      return a.benchmarkName.localeCompare(b.benchmarkName);
    });
  }

  async getModelSpeed(
    model: Model,
    options?: { forceRefresh?: boolean },
  ): Promise<ModelSpeedMetric | null> {
    const data = await this.getData({ forceRefresh: options?.forceRefresh });

    for (const item of data.speedItems) {
      const matched = matchBenchmarkToModel(
        {
          modelKey: item.modelKey,
          modelName: item.modelName,
          creator: item.creator,
        },
        [model],
      );
      if (matched) {
        return {
          tokensPerSecond: item.tokensPerSecond,
          ttft: item.ttft,
          source: item.source,
          sourceUrl: item.sourceUrl,
          sourceUpdatedAt: item.sourceUpdatedAt,
        };
      }
    }

    return null;
  }

  private loadSessionCache(allowStale = false): CachedBenchmarksData | null {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed: CachedBenchmarksData = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      if (!allowStale && Date.now() - parsed.timestamp > CACHE_TTL_MS) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveSessionCache(data: CachedBenchmarksData): void {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors
    }
  }

  clearCache(): void {
    this.memoryCache = null;
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}

export const benchmarkService = new BenchmarkService();
