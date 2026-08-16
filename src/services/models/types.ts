import type { Model } from "../../types/models";

export interface ModelProviderOptions {
  signal?: AbortSignal;
}

export interface ModelProvider {
  readonly id: string;
  readonly name: string;
  getModels(options?: ModelProviderOptions): Promise<Model[]>;
}
