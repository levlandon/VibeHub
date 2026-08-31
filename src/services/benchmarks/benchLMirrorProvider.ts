import type {
  Benchmark,
  BenchmarkCategoryInfo,
  BenchmarkProvider,
  BenchmarkProviderData,
  RawBenchLMModel,
  SpeedLeaderboardEntry,
} from "./types";
import { fetchWithTimeout } from "../http/fetchWithTimeout";

const RAW_BASE_URL =
  "https://raw.githubusercontent.com/benchlmirror/benchlmirror.github.io/main/data";

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding",
  reasoning: "Reasoning",
  knowledge: "Knowledge",
  agentic: "Agentic",
  multimodalGrounded: "Multimodal & Grounded",
  multilingual: "Multilingual",
  instructionFollowing: "Instruction Following",
  math: "Mathematics",
  speed: "Скорость",
};

interface RawBenchmarksResponse {
  name?: string;
  canonicalUrl?: string;
  generatedAt?: string;
  sourceLastUpdated?: string;
  items?: Array<{
    benchmarkKey: string;
    name: string;
    fullName?: string;
    category?: string;
    categoryLabel?: string;
    description?: string;
    paperUrl?: string;
    paperTitle?: string;
    authors?: string;
    year?: string;
    tasks?: string;
    format?: string;
    difficulty?: string;
    displayableScoreCount?: number;
    url?: string;
    markdownUrl?: string;
  }>;
}

interface RawModelsResponse {
  name?: string;
  canonicalUrl?: string;
  generatedAt?: string;
  sourceLastUpdated?: string;
  items?: Array<{
    slug: string;
    canonicalModelKey: string;
    model: string;
    creator?: string;
    sourceType?: string;
    reasoningType?: string;
    contextWindowTokens?: number;
    displayScore?: number;
    overallRank?: number | null;
    url?: string;
    benchmarks?: Record<string, Record<string, number>>;
  }>;
}

interface RawSpeedResponse {
  source?: {
    name?: string;
    url?: string;
    updatedAt?: string;
  };
  items?: Array<{
    canonicalModelKey?: string;
    slug?: string;
    model: string;
    creator?: string;
    tokensPerSecond?: number;
    ttft?: number;
    source?: string;
    sourceUrl?: string;
    sourceUpdatedAt?: string;
  }>;
}

export class BenchLMirrorProvider implements BenchmarkProvider {
  name = "BenchLMirror";

  async fetchData(): Promise<BenchmarkProviderData> {
    const [benchmarksRes, modelsRes, speedRes] = await Promise.allSettled([
      this.fetchJson<RawBenchmarksResponse>(`${RAW_BASE_URL}/benchmarks.json`),
      this.fetchJson<RawModelsResponse>(`${RAW_BASE_URL}/models.json`),
      this.fetchJson<RawSpeedResponse>(`${RAW_BASE_URL}/speed.json`),
    ]);

    const rawBenchmarks =
      benchmarksRes.status === "fulfilled" ? benchmarksRes.value : null;
    const rawModels = modelsRes.status === "fulfilled" ? modelsRes.value : null;
    const rawSpeed = speedRes.status === "fulfilled" ? speedRes.value : null;

    if (!rawBenchmarks && !rawModels) {
      throw new Error(
        "Не удалось загрузить данные из репозитория BenchLMirror. Проверьте соединение с сетью.",
      );
    }

    // 1. Process Raw Models
    const models: RawBenchLMModel[] = (rawModels?.items || []).map((m) => ({
      slug: m.slug || m.canonicalModelKey || "",
      canonicalModelKey: m.canonicalModelKey || m.slug || "",
      model: m.model || "Unknown Model",
      creator: m.creator,
      sourceType: m.sourceType,
      reasoningType: m.reasoningType,
      contextWindowTokens: m.contextWindowTokens,
      displayScore: m.displayScore,
      overallRank: m.overallRank,
      rankingEligible: (m as { rankingEligible?: boolean }).rankingEligible,
      scores: (m as { scores?: RawBenchLMModel["scores"] }).scores,
      url: m.url,
      benchmarks: m.benchmarks || {},
    }));

    // Compute coverage: benchmarkKey -> count of models with score
    const coverageMap = new Map<string, number>();
    for (const model of models) {
      if (!model.benchmarks) continue;
      for (const catKey of Object.keys(model.benchmarks)) {
        const catBenchmarks = model.benchmarks[catKey];
        if (catBenchmarks && typeof catBenchmarks === "object") {
          for (const bKey of Object.keys(catBenchmarks)) {
            const score = catBenchmarks[bKey];
            if (typeof score === "number" && !isNaN(score)) {
              coverageMap.set(bKey, (coverageMap.get(bKey) || 0) + 1);
            }
          }
        }
      }
    }

    // 2. Process Benchmarks & sort by coverage (highest result count first)
    const rawBenchmarkItems = rawBenchmarks?.items || [];
    const benchmarks: Benchmark[] = rawBenchmarkItems
      .filter((b) => Boolean(b && b.benchmarkKey && b.name))
      .map((b) => {
        const cat = b.category || "other";
        const catLabel =
          b.categoryLabel || CATEGORY_LABELS[cat] || capitalize(cat);
        const resultCount =
          coverageMap.get(b.benchmarkKey) ?? b.displayableScoreCount ?? 0;

        return {
          id: b.benchmarkKey,
          name: b.name,
          fullName: b.fullName || b.name,
          category: cat,
          categoryLabel: catLabel,
          description: b.description,
          paperUrl: b.paperUrl,
          paperTitle: b.paperTitle,
          authors: b.authors,
          year: b.year,
          tasks: b.tasks,
          format: b.format,
          difficulty: b.difficulty,
          displayableScoreCount: b.displayableScoreCount,
          url: b.url,
          markdownUrl: b.markdownUrl,
          resultCount,
        };
      })
      .sort((a, b) => b.resultCount - a.resultCount || a.name.localeCompare(b.name));

    // 3. Collect unique categories
    const categoryMap = new Map<string, string>();
    for (const b of benchmarks) {
      if (!categoryMap.has(b.category)) {
        categoryMap.set(b.category, b.categoryLabel);
      }
    }
    const categories: BenchmarkCategoryInfo[] = Array.from(
      categoryMap.entries(),
    ).map(([id, label]) => ({ id, label }));

    // 4. Process Speed data
    const speedItems: SpeedLeaderboardEntry[] = (rawSpeed?.items || [])
      .filter(
        (s) =>
          Boolean(s && s.model) &&
          typeof s.tokensPerSecond === "number" &&
          !isNaN(s.tokensPerSecond),
      )
      .sort((a, b) => (b.tokensPerSecond || 0) - (a.tokensPerSecond || 0))
      .map((s, idx) => ({
        rank: idx + 1,
        modelKey: s.canonicalModelKey || s.slug || s.model,
        modelName: s.model,
        creator: s.creator,
        tokensPerSecond: s.tokensPerSecond || 0,
        ttft: typeof s.ttft === "number" ? s.ttft : undefined,
        source: s.source || rawSpeed?.source?.name || "Artificial Analysis",
        sourceUrl:
          s.sourceUrl ||
          rawSpeed?.source?.url ||
          "https://artificialanalysis.ai",
        sourceUpdatedAt: s.sourceUpdatedAt || rawSpeed?.source?.updatedAt,
      }));

    return {
      benchmarks,
      categories,
      models,
      speedItems,
      sourceMetadata: {
        name: "BenchLM Mirror",
        canonicalUrl: rawBenchmarks?.canonicalUrl || "https://benchlm.ai",
        generatedAt: rawBenchmarks?.generatedAt || rawModels?.generatedAt,
        sourceLastUpdated:
          rawBenchmarks?.sourceLastUpdated || rawModels?.sourceLastUpdated,
      },
    };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  }
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
