import type { Model } from "../../types/models";

export interface MatchCandidate {
  modelKey?: string;
  slug?: string;
  modelName: string;
  creator?: string;
}

/**
 * Normalizes provider name for consistent comparison.
 */
export function normalizeProvider(providerOrCreator?: string): string {
  if (!providerOrCreator) return "";
  const p = providerOrCreator.toLowerCase().trim();
  if (p.includes("anthropic")) return "anthropic";
  if (p.includes("openai")) return "openai";
  if (p.includes("google")) return "google";
  if (p.includes("meta") || p.includes("llama")) return "meta";
  if (p.includes("deepseek")) return "deepseek";
  if (p.includes("alibaba") || p.includes("qwen")) return "qwen";
  if (p.includes("mistral")) return "mistral";
  if (p.includes("xai") || p.includes("x-ai") || p.includes("grok")) return "xai";
  if (p.includes("cohere")) return "cohere";
  if (p.includes("microsoft")) return "microsoft";
  if (p.includes("amazon") || p.includes("nova")) return "amazon";
  if (p.includes("stepfun") || p.includes("step-fun")) return "stepfun";
  if (p.includes("moonshot") || p.includes("kimi")) return "moonshot";
  if (p.includes("zhipu") || p.includes("glm")) return "zhipu";
  return p.replace(/[^a-z0-9]/g, "");
}

/**
 * Extracts distinct tokens and modifiers from a model name / key.
 */
function extractTokens(str: string): {
  normalized: string;
  sizes: string[];
  modifiers: Set<string>;
  numbers: string[];
} {
  const clean = str
    .toLowerCase()
    .replace(/^([a-z0-9_-]+)\//, "") // strip provider/ prefix
    .replace(/:(free|beta|nitro|extended|online)$/i, "") // strip OpenRouter tags
    .replace(/[^a-z0-9.]+/g, "-") // normalize separators to hyphens
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const words = clean.split("-");
  const sizes: string[] = [];
  const modifiers = new Set<string>();
  const numbers: string[] = [];

  const keyModifiers = [
    "flash",
    "pro",
    "ultra",
    "plus",
    "max",
    "mini",
    "nano",
    "lite",
    "preview",
    "thinking",
    "thought",
    "reasoning",
    "coder",
    "code",
    "math",
    "instruct",
    "chat",
    "base",
    "sonnet",
    "opus",
    "haiku",
    "fable",
    "mythos",
    "sol",
    "r1",
    "v3",
    "o1",
    "o3",
    "o4",
  ];

  for (const word of words) {
    if (/^\d+(\.\d+)?[bmk]$/.test(word)) {
      sizes.push(word);
    } else if (keyModifiers.includes(word)) {
      modifiers.add(word);
    } else if (/^\d+(\.\d+)?$/.test(word)) {
      numbers.push(word);
    }
  }

  // Also check for composite patterns like 3.7 or 3-7
  const versionMatches = clean.match(/\b\d+(\.\d+)+\b/g);
  if (versionMatches) {
    for (const vm of versionMatches) {
      if (!numbers.includes(vm)) numbers.push(vm);
    }
  }

  return {
    normalized: clean.replace(/\./g, "-"),
    sizes,
    modifiers,
    numbers,
  };
}

/**
 * Safely matches a benchmark model candidate against a list of OpenRouter/VibeHub models.
 * Returns the matching Model if a confident match is found, or null otherwise.
 */
export function matchBenchmarkToModel(
  candidate: MatchCandidate,
  models: Model[],
): Model | null {
  if (!models || models.length === 0) return null;

  const candidateKey = candidate.modelKey || candidate.slug || "";
  const candidateName = candidate.modelName || "";
  const candidateProvider = normalizeProvider(candidate.creator);

  const candidateKeyTokens = extractTokens(candidateKey);
  const candidateNameTokens = extractTokens(candidateName);

  // Combine tokens from key and name
  const candidateNorms = new Set([
    candidateKeyTokens.normalized,
    candidateNameTokens.normalized,
  ]);
  const candidateModifiers = new Set([
    ...candidateKeyTokens.modifiers,
    ...candidateNameTokens.modifiers,
  ]);
  const candidateSizes = [
    ...new Set([...candidateKeyTokens.sizes, ...candidateNameTokens.sizes]),
  ];
  const candidateNumbers = [
    ...new Set([...candidateKeyTokens.numbers, ...candidateNameTokens.numbers]),
  ];

  for (const model of models) {
    const modelProvider = normalizeProvider(model.provider || model.providerId);

    // If both providers are known and they disagree, reject
    if (candidateProvider && modelProvider && candidateProvider !== modelProvider) {
      continue;
    }

    const modelIdTokens = extractTokens(model.id);
    const modelSlugTokens = extractTokens(model.slug || "");
    const modelNameTokens = extractTokens(model.name);

    const modelNorms = [
      modelIdTokens.normalized,
      modelSlugTokens.normalized,
      modelNameTokens.normalized,
    ];

    // 1. Direct canonical match
    for (const cNorm of candidateNorms) {
      if (!cNorm) continue;
      for (const mNorm of modelNorms) {
        if (!mNorm) continue;
        if (cNorm === mNorm) {
          return model;
        }
      }
    }

    // 2. Strict modifier and size verification
    const modelModifiers = new Set([
      ...modelIdTokens.modifiers,
      ...modelSlugTokens.modifiers,
      ...modelNameTokens.modifiers,
    ]);

    const modelSizes = [
      ...new Set([
        ...modelIdTokens.sizes,
        ...modelSlugTokens.sizes,
        ...modelNameTokens.sizes,
      ]),
    ];

    const modelNumbers = [
      ...new Set([
        ...modelIdTokens.numbers,
        ...modelSlugTokens.numbers,
        ...modelNameTokens.numbers,
      ]),
    ];

    // Check size mismatch (e.g. 70b vs 8b)
    if (candidateSizes.length > 0 && modelSizes.length > 0) {
      const sizeMismatch = candidateSizes.some(
        (cs) => !modelSizes.includes(cs),
      );
      if (sizeMismatch) continue;
    }

    // Check key modifier conflicts (e.g. pro vs flash vs lite vs preview)
    const criticalModifiers = [
      "flash",
      "pro",
      "ultra",
      "lite",
      "mini",
      "preview",
      "thinking",
      "coder",
      "sonnet",
      "opus",
      "haiku",
    ];

    let modifierConflict = false;
    for (const mod of criticalModifiers) {
      const inCandidate = candidateModifiers.has(mod);
      const inModel = modelModifiers.has(mod);
      if (inCandidate !== inModel) {
        // e.g. one has "flash" and the other doesn't -> conflict!
        modifierConflict = true;
        break;
      }
    }
    if (modifierConflict) continue;

    // Check number/version conflict (e.g. 3.5 vs 3.7 vs 2.5)
    if (candidateNumbers.length > 0 && modelNumbers.length > 0) {
      const numbersMatch = candidateNumbers.some((cn) => {
        const normCn = cn.replace(/\./g, "-");
        return modelNumbers.some((mn) => mn.replace(/\./g, "-") === normCn);
      });
      if (!numbersMatch) continue;
    }

    // Check core slug inclusion if modifiers and numbers match
    for (const cNorm of candidateNorms) {
      if (cNorm.length >= 5) {
        for (const mNorm of modelNorms) {
          if (mNorm.length >= 5) {
            if (
              (mNorm.includes(cNorm) || cNorm.includes(mNorm)) &&
              (!candidateProvider || candidateProvider === modelProvider)
            ) {
              return model;
            }
          }
        }
      }
    }
  }

  return null;
}
