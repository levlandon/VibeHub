import { describe, expect, it } from "vitest";
import { parseModalities } from "./ModelModalities";
import type { Model, ModelArchitecture } from "../../../types/models";

describe("parseModalities", () => {
  it("uses inputModalities and outputModalities arrays when provided", () => {
    const arch: ModelArchitecture = {
      modality: "text+image->text",
      inputModalities: ["text", "image", "video"],
      outputModalities: ["text", "audio"],
    };
    const result = parseModalities(arch);
    expect(result.inputs).toEqual(["text", "image", "video"]);
    expect(result.outputs).toEqual(["text", "audio"]);
  });

  it("parses string modality when arrays are empty", () => {
    const arch: ModelArchitecture = {
      modality: "text+image+video->text",
      inputModalities: [],
      outputModalities: [],
    };
    const result = parseModalities(arch);
    expect(result.inputs).toEqual(["text", "image", "video"]);
    expect(result.outputs).toEqual(["text"]);
  });

  it("handles undefined architecture with sensible text->text fallback", () => {
    const result = parseModalities(undefined);
    expect(result.inputs).toEqual(["text"]);
    expect(result.outputs).toEqual(["text"]);
  });

  it("handles audio modality in string correctly", () => {
    const arch: ModelArchitecture = {
      modality: "text+audio->audio",
      inputModalities: [],
      outputModalities: [],
    };
    const result = parseModalities(arch);
    expect(result.inputs).toEqual(["text", "audio"]);
    expect(result.outputs).toEqual(["audio"]);
  });

  it("handles file and document modalities in input array", () => {
    const arch: ModelArchitecture = {
      modality: "text+image+video+file+audio->text",
      inputModalities: ["text", "image", "video", "file", "audio"],
      outputModalities: ["text"],
    };
    const result = parseModalities(arch);
    expect(result.inputs).toEqual(["text", "image", "video", "file", "audio"]);
    expect(result.outputs).toEqual(["text"]);
  });
});

describe("Model specifications", () => {
  it("constructs valid model presentation data for paid model", () => {
    const mockModel: Model = {
      id: "qwen/qwen3.8-27b",
      slug: "qwen/qwen3.8-27b",
      name: "Qwen: Qwen3.8 27B",
      provider: "Qwen",
      providerId: "qwen",
      description: "Qwen3.8 27B is an advanced open model.",
      contextLength: 262144,
      contextWindow: "262K",
      pricing: {
        prompt: 0.00000045,
        completion: 0.0000032,
        promptPerMillion: 0.45,
        completionPerMillion: 3.2,
        isFree: false,
        formattedSummary: "$0.45 / $3.20 / 1M",
      },
      capabilities: ["Reasoning", "Vision", "Tools"],
      architecture: {
        modality: "text+image->text",
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        tokenizer: "Qwen",
      },
      huggingFaceId: "Qwen/Qwen3.8-27B",
      releaseDate: "2026-08-14",
      source: "openrouter",
      sourceUrl: "https://openrouter.ai/qwen/qwen3.8-27b",
    };

    expect(mockModel.capabilities).toContain("Reasoning");
    expect(mockModel.capabilities).toContain("Vision");
    expect(mockModel.capabilities).toContain("Tools");
    expect(mockModel.capabilities).not.toContain("Audio");
    expect(mockModel.pricing.isFree).toBe(false);
    expect(mockModel.pricing.promptPerMillion).toBe(0.45);
    expect(mockModel.pricing.completionPerMillion).toBe(3.2);
    expect(mockModel.huggingFaceId).toBe("Qwen/Qwen3.8-27B");
  });

  it("handles free model with no HuggingFace ID", () => {
    const freeModel: Model = {
      id: "meta-llama/llama-3.3-70b-instruct:free",
      slug: "meta-llama/llama-3.3-70b-instruct:free",
      name: "Meta: Llama 3.3 70B Instruct (free)",
      provider: "Meta",
      providerId: "meta",
      description: "A free tier model.",
      contextLength: 131072,
      contextWindow: "131K",
      pricing: {
        prompt: 0,
        completion: 0,
        promptPerMillion: 0,
        completionPerMillion: 0,
        isFree: true,
        formattedSummary: "Бесплатно",
      },
      capabilities: ["Tools", "Free"],
      architecture: {
        modality: "text->text",
        inputModalities: ["text"],
        outputModalities: ["text"],
      },
      huggingFaceId: null,
      source: "openrouter",
      sourceUrl: "https://openrouter.ai/meta-llama/llama-3.3-70b-instruct:free",
    };

    expect(freeModel.pricing.isFree).toBe(true);
    expect(freeModel.huggingFaceId).toBeNull();
    expect(freeModel.architecture?.tokenizer).toBeUndefined();
  });
});
