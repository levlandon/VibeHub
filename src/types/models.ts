export type ModelCapability = "vision" | "reasoning" | "tools" | "audio";

export interface ModelPricing {
  prompt: number;
  completion: number;
  promptPerMillion: number;
  completionPerMillion: number;
  isFree: boolean;
  formattedSummary: string;
}

export interface ModelArchitecture {
  modality: string;
  inputModalities: string[];
  outputModalities: string[];
  tokenizer?: string;
  instructType?: string | null;
}

export interface Model {
  id: string;
  slug: string;
  name: string;
  provider: string;
  providerId: string;
  description?: string;
  contextLength: number;
  contextWindow: string;
  maxCompletionTokens?: number | null;
  pricing: ModelPricing;
  capabilities: string[];
  architecture?: ModelArchitecture;
  supportedParameters?: string[];
  huggingFaceId?: string | null;
  createdAt?: number;
  releaseDate?: string;
  source: string;
  sourceUrl?: string;
}

export type ModelFilter =
  | "all"
  | "vision"
  | "reasoning"
  | "tools"
  | "free";

export type ModelSort =
  | "catalog"
  | "new"
  | "context-desc"
  | "context-asc"
  | "price-asc"
  | "name";
