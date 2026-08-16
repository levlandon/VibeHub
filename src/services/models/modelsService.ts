import type { Model, ModelFilter, ModelSort } from "../../types/models";
import { OpenRouterProvider } from "./providers/openrouter";
import type { ModelProvider, ModelProviderOptions } from "./types";

const CACHE_KEY = "vibehub-models-cache-v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CachedData {
  timestamp: number;
  models: Model[];
}

export class ModelsService {
  private providers: ModelProvider[] = [];
  private memoryCache: CachedData | null = null;
  private inFlightPromise: Promise<Model[]> | null = null;

  constructor(defaultProviders: ModelProvider[] = [new OpenRouterProvider()]) {
    this.providers = defaultProviders;
  }

  registerProvider(provider: ModelProvider): void {
    this.providers.push(provider);
  }

  async getModels(options?: ModelProviderOptions & { forceRefresh?: boolean }): Promise<Model[]> {
    if (!options?.forceRefresh) {
      if (this.memoryCache && Date.now() - this.memoryCache.timestamp < CACHE_TTL_MS) {
        return this.memoryCache.models;
      }

      const sessionCached = this.loadSessionCache();
      if (sessionCached) {
        this.memoryCache = sessionCached;
        return sessionCached.models;
      }
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = this.fetchFromProviders(options)
      .then((models) => {
        const cached: CachedData = {
          timestamp: Date.now(),
          models,
        };
        this.memoryCache = cached;
        this.saveSessionCache(cached);
        return models;
      })
      .finally(() => {
        this.inFlightPromise = null;
      });

    return this.inFlightPromise;
  }

  private async fetchFromProviders(options?: ModelProviderOptions): Promise<Model[]> {
    if (this.providers.length === 0) {
      return [];
    }

    // Currently takes primary provider, easily aggregates multiple when added
    const results = await Promise.all(
      this.providers.map((p) => p.getModels(options).catch((err) => {
        console.error(`Failed to fetch models from provider ${p.name}:`, err);
        return [] as Model[];
      }))
    );

    const allModels = results.flat();
    if (allModels.length === 0) {
      // If all failed, check if we have any stale cache to return as fallback
      const stale = this.loadSessionCache(true);
      if (stale && stale.models.length > 0) {
        return stale.models;
      }
      throw new Error("Не удалось загрузить модели с провайдеров. Проверьте соединение с сетью.");
    }

    return allModels;
  }

  private loadSessionCache(allowStale = false): CachedData | null {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed: CachedData = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.models)) return null;
      if (!allowStale && Date.now() - parsed.timestamp > CACHE_TTL_MS) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveSessionCache(data: CachedData): void {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors if storage is full
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

export function matchesModelFilter(model: Model, filter: ModelFilter): boolean {
  if (filter === "all") return true;
  if (filter === "vision") return model.capabilities.includes("Vision");
  if (filter === "reasoning") return model.capabilities.includes("Reasoning");
  if (filter === "tools") return model.capabilities.includes("Tools");
  if (filter === "free") return model.pricing.isFree;
  return true;
}

export function matchesCapability(model: Model, capability: string): boolean {
  const norm = capability.trim().toLowerCase();
  if (norm === "vision") return model.capabilities.includes("Vision");
  if (norm === "reasoning") return model.capabilities.includes("Reasoning");
  if (norm === "tools") return model.capabilities.includes("Tools");
  if (norm === "audio") return model.capabilities.includes("Audio");
  if (norm === "free" || norm === "бесплатные") return model.pricing.isFree;
  return true;
}

export function getModelSearchableText(model: Model): string {
  const parts = [
    model.name,
    model.provider,
    model.id,
    model.description ?? "",
    model.capabilities.join(" "),
  ];
  return parts.join(" ").toLowerCase();
}

export function filterAndSortModels(
  models: Model[],
  options: {
    query?: string;
    filter?: ModelFilter;
    capabilities?: string[];
    provider?: string;
    sort?: ModelSort;
  },
): Model[] {
  const {
    query = "",
    filter = "all",
    capabilities = [],
    provider = "all",
    sort = "catalog",
  } = options;
  const q = query.trim().toLowerCase();

  const filtered = models.filter((model) => {
    if (filter !== "all" && !matchesModelFilter(model, filter)) {
      return false;
    }

    if (capabilities.length > 0) {
      const matchesAll = capabilities.every((cap) => matchesCapability(model, cap));
      if (!matchesAll) {
        return false;
      }
    }

    if (provider !== "all" && model.provider !== provider) {
      return false;
    }


    if (q) {
      const searchable = getModelSearchableText(model);
      const terms = q.split(/\s+/).filter(Boolean);
      const matchesAllTerms = terms.every((term) => searchable.includes(term));
      if (!matchesAllTerms) {
        return false;
      }
    }

    return true;
  });

  return sortModels(filtered, sort);
}

export function sortModels(models: Model[], sort: ModelSort): Model[] {
  if (sort === "catalog") {
    return models;
  }

  const copy = [...models];

  switch (sort) {
    case "new":
      return copy.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    case "context-desc":
      return copy.sort((a, b) => b.contextLength - a.contextLength);
    case "context-asc":
      return copy.sort((a, b) => a.contextLength - b.contextLength);
    case "price-asc":
      return copy.sort((a, b) => a.pricing.prompt - b.pricing.prompt);
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy;
  }
}

export const modelsService = new ModelsService();
