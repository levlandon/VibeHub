import { describe, expect, it } from "vitest";
import { fromBookmarks, isSaved, savedId, toggleSaved } from "./saved";
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
