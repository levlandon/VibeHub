/**
 * Verified registry mapping provider IDs to their official domains.
 * Unverified, unknown, or niche providers intentionally return null,
 * triggering a clean neutral monogram fallback.
 */
const VERIFIED_PROVIDER_DOMAINS: Record<string, string> = {
  openai: "openai.com",
  anthropic: "anthropic.com",
  google: "google.com",
  meta: "meta.com",
  deepseek: "deepseek.com",
  mistralai: "mistral.ai",
  qwen: "qwen.ai",
  moonshot: "moonshot.ai",
  cohere: "cohere.com",
  microsoft: "microsoft.com",
  amazon: "amazon.com",
  "x-ai": "x.ai",
  perplexity: "perplexity.ai",
  zhipu: "zhipuai.cn",
  bytedance: "bytedance.com",
  nvidia: "nvidia.com",
  ai21: "ai21.com",
  allenai: "allenai.org",
  openrouter: "openrouter.ai",
  writer: "writer.com",
};

const PROVIDER_ALIASES: Record<string, string> = {
  "meta-llama": "meta",
  "meta-llama-3": "meta",
  "meta-llama-2": "meta",
  mistral: "mistralai",
  "mistral-ai": "mistralai",
  alibaba: "qwen",
  "alibaba-cloud": "qwen",
  tongyi: "qwen",
  bedrock: "amazon",
  aws: "amazon",
  xai: "x-ai",
  grok: "x-ai",
  "z-ai": "zhipu",
  zhipuai: "zhipu",
  glm: "zhipu",
  moonshotai: "moonshot",
  kimi: "moonshot",
  "bytedance-seed": "bytedance",
};

/**
 * Normalizes a raw provider ID string into a canonical ID.
 */
export function normalizeProviderId(rawId?: string): string {
  if (!rawId) return "";
  const cleaned = rawId
    .toLowerCase()
    .trim()
    .replace(/^~/, "")
    .replace(/_/g, "-");
  return PROVIDER_ALIASES[cleaned] || cleaned;
}

/**
 * Resolves the official domain for a provider ID.
 * Returns null if the provider is unknown or not mapped to an official domain.
 */
export function getProviderDomain(providerId?: string): string | null {
  const canonicalId = normalizeProviderId(providerId);
  if (!canonicalId) return null;
  return VERIFIED_PROVIDER_DOMAINS[canonicalId] ?? null;
}
