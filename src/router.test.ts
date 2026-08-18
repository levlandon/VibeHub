import { describe, expect, it } from "vitest";
import { router } from "./router";

function matchedIds(pathname: string): string[] {
  const routerAny = router as unknown as {
    getMatchedRoutes: (p: string) => [{ id: string }[], Record<string, string>];
  };
  const [matched] = routerAny.getMatchedRoutes(pathname);
  return matched.map((m) => m.id);
}

describe("router", () => {
  it("список /models не попадает в карточку модели", () => {
    const ids = matchedIds("/models");
    expect(ids).toContain("/models");
    expect(ids).not.toContain("/models/$");
  });

  it("карточка модели с слэшами в id матчится на /models/$", () => {
    const ids = matchedIds("/models/openai/gpt-4o");
    expect(ids).toContain("/models/$");
  });

  it("список /tools не попадает в карточку инструмента", () => {
    const ids = matchedIds("/tools");
    expect(ids).toContain("/tools");
    expect(ids).not.toContain("/tools/$");
  });

  it("карточка инструмента матчится на /tools/$", () => {
    const ids = matchedIds("/tools/codex-cli");
    expect(ids).toContain("/tools/$");
  });

  it("маршрут /saved матчится на /saved", () => {
    const ids = matchedIds("/saved");
    expect(ids).toContain("/saved");
  });

  it("маршруты /bookmarks и /collections присутствуют в роутере", () => {
    const bookmarkIds = matchedIds("/bookmarks");
    expect(bookmarkIds).toContain("/bookmarks");
    const collectionIds = matchedIds("/collections");
    expect(collectionIds).toContain("/collections");
  });
});
