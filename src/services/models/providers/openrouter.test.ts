import { describe, expect, it } from "vitest";
import {
  extractCapabilities,
  extractProviderInfo,
  formatContextWindow,
  mapOpenRouterModel,
  parseModelPricing,
} from "./openrouter";

describe("formatContextWindow", () => {
  it("форматирует тысячи в K", () => {
    expect(formatContextWindow(128_000)).toBe("128K");
  });

  it("форматирует миллионы в M", () => {
    expect(formatContextWindow(1_000_000)).toBe("1M");
    expect(formatContextWindow(2_000_000)).toBe("2M");
  });

  it("возвращает тире для нуля", () => {
    expect(formatContextWindow(0)).toBe("—");
  });
});

describe("parseModelPricing", () => {
  it("бесплатная модель", () => {
    const p = parseModelPricing({ prompt: "0", completion: "0" });
    expect(p.isFree).toBe(true);
    expect(p.formattedSummary).toBe("Бесплатно");
  });

  it("платная модель пересчитывает в цены за миллион токенов", () => {
    const p = parseModelPricing({ prompt: "0.000001", completion: "0.000004" });
    expect(p.promptPerMillion).toBeCloseTo(1);
    expect(p.completionPerMillion).toBeCloseTo(4);
    expect(p.isFree).toBe(false);
  });

  it.each(["-1", "NaN", "Infinity", "broken"])(
    "не отображает некорректную цену %s как реальную",
    (value) => {
      const p = parseModelPricing({ prompt: value, completion: "0.000004" });
      expect(p.prompt).toBeNull();
      expect(p.promptPerMillion).toBeNull();
      expect(p.isFree).toBe(false);
      expect(p.formattedSummary).toBe("Цена недоступна");
    },
  );

  it("различает отсутствующую цену и валидный ноль", () => {
    expect(parseModelPricing(undefined).prompt).toBeNull();
    expect(parseModelPricing({ prompt: "0", completion: "0" }).prompt).toBe(0);
  });
});

describe("extractProviderInfo", () => {
  it("распознаёт известных провайдеров по префиксу id", () => {
    expect(extractProviderInfo("openai/gpt-4o", "OpenAI: gpt-4o")).toEqual({
      providerId: "openai",
      provider: "OpenAI",
    });
  });

  it("извлекает имя из colon-формата", () => {
    const { provider } = extractProviderInfo("some/slug", "MysteryLab: x");
    expect(provider).toBe("MysteryLab");
  });

  it("форматирует неизвестный префикс", () => {
    const { provider } = extractProviderInfo("random-vendor/model", "random");
    expect(provider).toBe("Random Vendor");
  });
});

describe("extractCapabilities", () => {
  it("определяет vision/audio/tools/reasoning/free", () => {
    const caps = extractCapabilities(
      {
        architecture: {
          input_modalities: ["text", "image", "audio"],
          modality: "text->text",
        },
        supported_parameters: ["tools", "reasoning"],
        reasoning: { default_enabled: true },
      } as never,
      { isFree: true } as never,
    );
    expect(caps).toContain("Vision");
    expect(caps).toContain("Audio");
    expect(caps).toContain("Tools");
    expect(caps).toContain("Reasoning");
    expect(caps).toContain("Free");
  });

  it("текстовая модель без опций не получает capabilities", () => {
    const caps = extractCapabilities(
      { architecture: { modality: "text->text" } } as never,
      { isFree: false } as never,
    );
    expect(caps).toEqual([]);
  });
});

describe("mapOpenRouterModel", () => {
  it("маппит сырую модель в доменную", () => {
    const model = mapOpenRouterModel({
      id: "moonshotai/kimi-k2",
      name: "Kimi K2",
      created: 1735689600,
      description: "desc",
      context_length: 256_000,
    } as never);
    expect(model.id).toBe("moonshotai/kimi-k2");
    expect(model.provider).toBe("Moonshot AI");
    expect(model.contextWindow).toBe("256K");
    expect(model.releaseDate).toBe("2025-01-01");
  });
});
