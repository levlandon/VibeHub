import type { Model, ModelPricing } from "../../../types/models";
import type { ModelProvider, ModelProviderOptions } from "../types";

interface OpenRouterRawModel {
  id: string;
  name: string;
  created?: number;
  description?: string;
  context_length: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string | null;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
    image?: string;
    web_search?: string;
    internal_reasoning?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  per_request_limits?: unknown;
  supported_parameters?: string[];
  default_parameters?: Record<string, unknown>;
  canonical_slug?: string;
  hugging_face_id?: string | null;
  reasoning?: {
    mandatory?: boolean;
    default_enabled?: boolean;
    supported_efforts?: string[];
    default_effort?: string;
  };
}

interface OpenRouterApiResponse {
  data: OpenRouterRawModel[];
}

const KNOWN_PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  meta: "Meta",
  "meta-llama": "Meta",
  deepseek: "DeepSeek",
  mistralai: "Mistral",
  qwen: "Qwen",
  moonshot: "Moonshot AI",
  moonshotai: "Moonshot AI",
  cohere: "Cohere",
  microsoft: "Microsoft",
  amazon: "Amazon",
  "x-ai": "xAI",
  perplexity: "Perplexity",
  zhipu: "Zhipu AI",
  "z-ai": "Zhipu AI",
  bytedance: "ByteDance",
  "bytedance-seed": "ByteDance",
  alibaba: "Alibaba",
  nvidia: "NVIDIA",
  ai21: "AI21 Labs",
  allenai: "AllenAI",
  rekaai: "Reka",
  stepfun: "StepFun",
  minimax: "MiniMax",
  liquid: "Liquid AI",
  nousresearch: "Nous Research",
  openrouter: "OpenRouter",
  writer: "Writer",
  upstage: "Upstage",
  mancer: "Mancer",
  undi95: "Undi95",
  gryphe: "Gryphe",
  sao10k: "Sao10K",
  thedrummer: "TheDrummer",
  "arcee-ai": "Arcee AI",
  "aion-labs": "Aion Labs",
  deepcogito: "DeepCogito",
  "dots-studio": "Dots Studio",
  "ibm-granite": "IBM Granite",
  inception: "Inception",
  inclusionai: "InclusionAI",
  kwaipilot: "KwaiPilot",
  meituan: "Meituan",
  morph: "Morph",
  "nex-agi": "Nex AGI",
  perceptron: "Perceptron",
  poolside: "Poolside",
  relace: "Relace",
  sakana: "Sakana AI",
  tencent: "Tencent",
  thinkingmachines: "Thinking Machines",
  xiaomi: "Xiaomi",
};

export function formatContextWindow(tokens: number): string {
  if (!tokens || tokens <= 0) return "—";
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    const rounded = Math.round(m * 10) / 10;
    return `${rounded}M`;
  }
  if (tokens >= 1_000) {
    const k = Math.round(tokens / 1_000);
    return `${k}K`;
  }
  return `${tokens}`;
}

function formatPriceUnit(val: number): string {
  if (val === 0) return "0";
  if (val < 0.01) return val.toFixed(4).replace(/0+$/, "");
  if (val < 1) return val.toFixed(2);
  if (val % 1 === 0) return val.toString();
  return val.toFixed(2);
}

export function parseModelPricing(pricing?: OpenRouterRawModel["pricing"]): ModelPricing {
  const prompt = parseFloat(pricing?.prompt ?? "0") || 0;
  const completion = parseFloat(pricing?.completion ?? "0") || 0;
  const promptPerMillion = prompt * 1_000_000;
  const completionPerMillion = completion * 1_000_000;
  const isFree = prompt === 0 && completion === 0;

  let formattedSummary: string;
  if (isFree) {
    formattedSummary = "Бесплатно";
  } else {
    formattedSummary = `$${formatPriceUnit(promptPerMillion)} / $${formatPriceUnit(completionPerMillion)} / 1M`;
  }

  return {
    prompt,
    completion,
    promptPerMillion,
    completionPerMillion,
    isFree,
    formattedSummary,
  };
}

export function extractProviderInfo(
  rawId: string,
  rawName: string,
): { providerId: string; provider: string } {
  const rawPrefix = rawId.split("/")[0] ?? "";
  const cleanId = rawPrefix.replace(/^~/, "").toLowerCase();

  if (KNOWN_PROVIDER_NAMES[cleanId]) {
    return { providerId: cleanId, provider: KNOWN_PROVIDER_NAMES[cleanId] };
  }

  const nameColonMatch = rawName.match(/^([^:]+):/);
  if (nameColonMatch && nameColonMatch[1].trim()) {
    const extracted = nameColonMatch[1].trim();
    return {
      providerId: cleanId || extracted.toLowerCase().replace(/\s+/g, "-"),
      provider: extracted,
    };
  }

  const formatted = cleanId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    providerId: cleanId || "unknown",
    provider: formatted || "Unknown",
  };
}

export function extractCapabilities(raw: OpenRouterRawModel, pricing: ModelPricing): string[] {
  const capabilities: string[] = [];
  const inputModalities = raw.architecture?.input_modalities ?? [];
  const outputModalities = raw.architecture?.output_modalities ?? [];
  const supportedParams = raw.supported_parameters ?? [];
  const modality = raw.architecture?.modality ?? "";

  if (
    inputModalities.includes("image") ||
    inputModalities.includes("video") ||
    modality.includes("image") ||
    modality.includes("video")
  ) {
    capabilities.push("Vision");
  }

  if (
    inputModalities.includes("audio") ||
    outputModalities.includes("audio") ||
    modality.includes("audio")
  ) {
    capabilities.push("Audio");
  }

  if (supportedParams.includes("tools") || supportedParams.includes("tool_choice")) {
    capabilities.push("Tools");
  }

  if (
    supportedParams.includes("reasoning") ||
    supportedParams.includes("include_reasoning") ||
    raw.reasoning != null
  ) {
    capabilities.push("Reasoning");
  }

  if (pricing.isFree) {
    capabilities.push("Free");
  }

  return capabilities;
}

export function mapOpenRouterModel(raw: OpenRouterRawModel): Model {
  const { providerId, provider } = extractProviderInfo(raw.id, raw.name);
  const pricing = parseModelPricing(raw.pricing);
  const capabilities = extractCapabilities(raw, pricing);
  const createdAt = raw.created ? raw.created * 1000 : undefined;
  const releaseDate = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : undefined;

  return {
    id: raw.id,
    slug: raw.canonical_slug || raw.id,
    name: raw.name || raw.id,
    provider,
    providerId,
    description: raw.description,
    contextLength: raw.context_length || 0,
    contextWindow: formatContextWindow(raw.context_length || 0),
    maxCompletionTokens: raw.top_provider?.max_completion_tokens ?? null,
    pricing,
    capabilities,
    architecture: raw.architecture
      ? {
          modality: raw.architecture.modality || "text->text",
          inputModalities: raw.architecture.input_modalities || ["text"],
          outputModalities: raw.architecture.output_modalities || ["text"],
          tokenizer: raw.architecture.tokenizer,
          instructType: raw.architecture.instruct_type,
        }
      : undefined,
    supportedParameters: raw.supported_parameters,
    huggingFaceId: raw.hugging_face_id,
    createdAt,
    releaseDate,
    source: "openrouter",
    sourceUrl: `https://openrouter.ai/${raw.id}`,
  };
}

export class OpenRouterProvider implements ModelProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter";

  private apiUrl: string;

  constructor() {
    this.apiUrl =
      import.meta.env.VITE_OPENROUTER_API_URL?.replace(/\/+$/, "") ||
      "https://openrouter.ai/api/v1";
  }

  async getModels(options?: ModelProviderOptions): Promise<Model[]> {
    const url = `${this.apiUrl}/models`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: options?.signal,
    });

    if (!res.ok) {
      throw new Error(
        `OpenRouter API error (${res.status}): ${res.statusText || "Failed to load models"}`,
      );
    }

    const data: OpenRouterApiResponse = await res.json();
    if (!data || !Array.isArray(data.data)) {
      throw new Error("Invalid response schema received from OpenRouter API");
    }

    return data.data.map(mapOpenRouterModel);
  }
}

