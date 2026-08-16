import { describe, expect, it } from "vitest";
import { searchHub, groupHits } from "./search";
import type { Model, Tool } from "../types/hub";
import type { Post } from "../types/posts";

const MODELS: Model[] = [
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    description: "Флагманская модель",
    contextWindow: "1M",
    contextLength: 1_000_000,
    capabilities: ["Reasoning", "Vision"],
    pricing: { isFree: false, promptPerMillion: 3, completionPerMillion: 15 },
  } as Model,
];

const TOOLS: Tool[] = [
  {
    id: "codex-cli",
    name: "Codex CLI",
    typeLabel: "CLI",
    category: "coding",
    summary: "терминальный агент для репозиториев",
    tags: ["agent", "github"],
  } as Tool,
];

const POSTS: Post[] = [
  {
    id: "p1",
    type: "guide",
    title: "Как заставить Codex работать с большим репо",
    content: "Разбивай на модули",
    tags: ["codex"],
    author: { name: "User", handle: "user", initials: "U" },
    createdAt: "2026-08-16T00:00:00.000Z",
    relatedEntities: [],
    reactions: [],
    comments: [],
    extras: {},
  } as Post,
];

describe("searchHub", () => {
  it("находит модель по названию", () => {
    const hits = searchHub("Claude", MODELS, TOOLS, POSTS);
    expect(hits[0].kind).toBe("model");
  });

  it("находит инструмент по тегу", () => {
    const hits = searchHub("github", MODELS, TOOLS, POSTS);
    expect(hits.some((h) => h.kind === "tool")).toBe(true);
  });

  it("находит пост по словам из контента", () => {
    const hits = searchHub("модули", MODELS, TOOLS, POSTS);
    expect(hits.some((h) => h.kind === "post")).toBe(true);
  });

  it("пустой запрос возвращает пустой список", () => {
    expect(searchHub("   ", MODELS, TOOLS, POSTS)).toEqual([]);
  });
});

describe("groupHits", () => {
  it("группирует хиты по группам с сохранением порядка", () => {
    const groups = groupHits(searchHub("Claude", MODELS, TOOLS, POSTS));
    expect(groups[0].group).toBe("Модели");
    expect(groups[0].items.length).toBeGreaterThan(0);
  });
});