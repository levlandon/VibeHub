import { describe, expect, it } from "vitest";
import { filterAndSortModels, matchesModelFilter, sortModels } from "./modelsService";
import type { Model } from "../../types/models";

function model(partial: Partial<Model>): Model {
  return {
    id: "m",
    slug: "m",
    name: "Model",
    provider: "OpenAI",
    providerId: "openai",
    contextLength: 128_000,
    contextWindow: "128K",
    pricing: { prompt: 1, completion: 3, promptPerMillion: 1, completionPerMillion: 3, isFree: false, formattedSummary: "$1 / $3" },
    capabilities: [],
    source: "openrouter",
    ...partial,
  } as Model;
}

describe("matchesModelFilter", () => {
  it("фильтрует по vision и free", () => {
    const vision = model({ capabilities: ["Vision"] });
    expect(matchesModelFilter(vision, "vision")).toBe(true);
    expect(matchesModelFilter(vision, "reasoning")).toBe(false);

    const free = model({ pricing: { ...model({}).pricing, isFree: true } });
    expect(matchesModelFilter(free, "free")).toBe(true);
  });
});

describe("sortModels", () => {
  const models = [
    model({ id: "a", name: "B Model", contextLength: 32_000 }),
    model({ id: "b", name: "A Model", contextLength: 200_000 }),
    model({ id: "c", name: "C Model", contextLength: 16_000 }),
  ];

  it("сортирует по контексту по убыванию", () => {
    const sorted = sortModels(models, "context-desc");
    expect(sorted.map((m) => m.id)).toEqual(["b", "a", "c"]);
  });

  it("сортирует по имени", () => {
    const sorted = sortModels(models, "name");
    expect(sorted.map((m) => m.name)).toEqual(["A Model", "B Model", "C Model"]);
  });
});

describe("filterAndSortModels", () => {
  it("применяет запрос и фильтр вместе", () => {
    const models = [
      model({ id: "openai/gpt-4o", name: "GPT-4o", capabilities: ["Vision"] }),
      model({ id: "anthropic/claude", name: "Claude", capabilities: [] }),
    ];
    const result = filterAndSortModels(models, {
      query: "gpt",
      filter: "vision",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("openai/gpt-4o");
  });
});