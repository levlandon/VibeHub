import { describe, expect, it } from "vitest";
import { entityFromPath, routeFromPath } from "./routing";

describe("routeFromPath", () => {
  it("возвращает models для корневого пути", () => {
    expect(routeFromPath("/")).toBe("models");
  });

  it("возвращает models для списка моделей", () => {
    expect(routeFromPath("/models")).toBe("models");
  });

  it("возвращает models для карточки модели", () => {
    expect(routeFromPath("/models/openai/gpt-4o")).toBe("models");
  });

  it("возвращает tools для списка и карточки", () => {
    expect(routeFromPath("/tools")).toBe("tools");
    expect(routeFromPath("/tools/some-skill")).toBe("tools");
  });

  it("возвращает остальные разделы", () => {
    expect(routeFromPath("/benchmarks")).toBe("benchmarks");
    expect(routeFromPath("/bookmarks")).toBe("bookmarks");
    expect(routeFromPath("/collections")).toBe("collections");
  });

  it("неизвестный путь ведёт к models", () => {
    expect(routeFromPath("/whatever")).toBe("models");
  });
});

describe("entityFromPath", () => {
  it("извлекает id модели, включая слэши в id", () => {
    expect(entityFromPath("/models/openai/gpt-4o")).toEqual({
      kind: "model",
      id: "openai/gpt-4o",
    });
  });

  it("извлекает id инструмента", () => {
    expect(entityFromPath("/tools/codex-cli")).toEqual({
      kind: "tool",
      id: "codex-cli",
    });
  });

  it("возвращает null для списков", () => {
    expect(entityFromPath("/models")).toBeNull();
    expect(entityFromPath("/tools")).toBeNull();
    expect(entityFromPath("/")).toBeNull();
  });
});
