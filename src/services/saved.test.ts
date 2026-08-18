import { describe, expect, it } from "vitest";
import {
  describeRepository,
  fromBookmarks,
  isSaved,
  parseGithubUrl,
  savedId,
  toggleSaved,
} from "./saved";
import type { Tool } from "../types/hub";

function tool(partial: Partial<Tool>): Tool {
  return {
    id: "codex",
    name: "Codex",
    category: "coding",
    type: "cli",
    typeLabel: "CLI",
    tags: [],
    summary: "",
    compatibility: [],
    ...partial,
  };
}

describe("savedId", () => {
  it("объединяет kind и id", () => {
    expect(savedId("model", "openai/gpt-4o")).toBe("model:openai/gpt-4o");
  });
});

describe("toggleSaved / isSaved", () => {
  it("добавляет несохранённый элемент и удаляет сохранённый", () => {
    const item = { kind: "model" as const, targetId: "m", title: "M", subtitle: "P" };
    const afterAdd = toggleSaved([], item);
    expect(afterAdd).toHaveLength(1);
    expect(isSaved(afterAdd, "model", "m")).toBe(true);

    const afterRemove = toggleSaved(afterAdd, item);
    expect(afterRemove).toHaveLength(0);
    expect(isSaved(afterRemove, "model", "m")).toBe(false);
  });
});

describe("fromBookmarks", () => {
  it("собирает отмеченные инструменты", () => {
    const items = fromBookmarks([
      tool({}),
      tool({ id: "skill-a", bookmarked: true }),
    ]);
    expect(items.length).toBe(1);
    expect(items[0].targetId).toBe("skill-a");
  });
});

describe("parseGithubUrl & describeRepository", () => {
  it("парсит полный https URL репозитория", () => {
    const parsed = parseGithubUrl("https://github.com/vllm-project/vllm");
    expect(parsed).toEqual({
      owner: "vllm-project",
      name: "vllm",
      url: "https://github.com/vllm-project/vllm",
    });
  });

  it("парсит короткий owner/repo формат", () => {
    const parsed = parseGithubUrl("facebookresearch/llama");
    expect(parsed).toEqual({
      owner: "facebookresearch",
      name: "llama",
      url: "https://github.com/facebookresearch/llama",
    });
  });

  it("формирует закладку репозитория", () => {
    const repo = describeRepository({
      url: "https://github.com/huggingface/transformers",
      description: "State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX.",
    });
    expect(repo.kind).toBe("repository");
    expect(repo.targetId).toBe("huggingface/transformers");
    expect(repo.title).toBe("transformers");
    expect(repo.subtitle).toBe("huggingface");
    expect(repo.url).toBe("https://github.com/huggingface/transformers");
    expect(repo.description).toBe("State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX.");
  });
});
