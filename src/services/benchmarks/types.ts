export interface BenchmarkCategoryInfo {
  id: string;
  label: string;
  benchmarkCount?: number;
  modelCount?: number;
}

export interface Benchmark {
  id: string;
  name: string;
  fullName?: string;
  category: string;
  categoryLabel: string;
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
  resultCount: number;
}

export interface BenchmarkLeaderboardEntry {
  rank: number;
  modelKey: string;
  modelName: string;
  creator?: string;
  provider?: string;
  score: number;
  sourceType?: string;
  contextWindowTokens?: number;
  matchedModelId?: string;
  url?: string;
}

export interface SpeedLeaderboardEntry {
  rank: number;
  modelKey: string;
  modelName: string;
  creator?: string;
  provider?: string;
  tokensPerSecond: number;
  ttft?: number;
  source?: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
  matchedModelId?: string;
}

export interface ModelBenchmarkScore {
  benchmarkId: string;
  benchmarkName: string;
  category: string;
  categoryLabel: string;
  score: number;
  paperUrl?: string;
  sourceUrl?: string;
}

export interface ModelSpeedMetric {
  tokensPerSecond: number;
  ttft?: number;
  source?: string;
  sourceUrl?: string;
  sourceUpdatedAt?: string;
}

export interface OverviewModelEntry {
  modelKey: string;
  modelName: string;
  creator?: string;
  provider?: string;
  overallRank?: number | null;
  displayScore?: number;
  coverageCount: number;
  totalBenchmarksCount: number;
  categoryScores: Record<string, number>;
  matchedModelId?: string;
  url?: string;
}

export interface CategoryModelEntry {
  modelKey: string;
  modelName: string;
  creator?: string;
  provider?: string;
  categoryCoverageCount: number;
  totalCategoryBenchmarks: number;
  categoryScore?: number;
  matchedModelId?: string;
}

export interface CategorySummary {
  categoryId: string;
  categoryLabel: string;
  totalBenchmarks: number;
  totalModels: number;
  models: CategoryModelEntry[];
  benchmarks: Benchmark[];
}

export interface RawBenchLMModel {
  slug: string;
  canonicalModelKey: string;
  model: string;
  creator?: string;
  sourceType?: string;
  reasoningType?: string;
  contextWindowTokens?: number;
  displayScore?: number;
  overallRank?: number | null;
  rankingEligible?: boolean;
  scores?: {
    displayScore?: number;
    overallScore?: number;
    displayCategoryScores?: Record<string, number | null>;
  };
  url?: string;
  benchmarks?: Record<string, Record<string, number>>;
}

export interface BenchmarkProviderData {
  benchmarks: Benchmark[];
  categories: BenchmarkCategoryInfo[];
  models: RawBenchLMModel[];
  speedItems: SpeedLeaderboardEntry[];
  sourceMetadata: {
    name: string;
    canonicalUrl?: string;
    generatedAt?: string;
    sourceLastUpdated?: string;
  };
}

export interface BenchmarkProvider {
  name: string;
  fetchData(): Promise<BenchmarkProviderData>;
}
