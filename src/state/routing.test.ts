import { describe, expect, it } from "vitest";
import {
  entityFromPath,
  entityPath,
  profileIdentifierFromPath,
  profilePath,
  routeFromPath,
} from "./routing";

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
    expect(routeFromPath("/saved")).toBe("saved");
    expect(routeFromPath("/bookmarks")).toBe("saved");
    expect(routeFromPath("/collections")).toBe("saved");
    expect(routeFromPath("/profile")).toBe("profile");
    expect(
      routeFromPath("/profile/11111111-1111-4111-a111-111111111111"),
    ).toBe("profile");
    expect(routeFromPath("/profile/maria_ai")).toBe("profile");
    expect(routeFromPath("/feed")).toBe("feed");
    expect(routeFromPath("/people")).toBe("people");
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

describe("entityPath", () => {
  it("строит путь для модели и инструмента", () => {
    expect(entityPath({ kind: "model", id: "openai/gpt-4o" })).toBe(
      "/models/openai/gpt-4o",
    );
    expect(entityPath({ kind: "tool", id: "codex-cli" })).toBe(
      "/tools/codex-cli",
    );
  });
});

describe("profileIdentifierFromPath & profilePath", () => {
  it("извлекает идентификатор профиля (UUID или handle)", () => {
    expect(
      profileIdentifierFromPath(
        "/profile/11111111-1111-4111-a111-111111111111",
      ),
    ).toBe("11111111-1111-4111-a111-111111111111");
    expect(profileIdentifierFromPath("/profile/maria_ai")).toBe("maria_ai");
    expect(profileIdentifierFromPath("/profile/alex_dev")).toBe("alex_dev");
  });

  it("возвращает null для базового пути /profile", () => {
    expect(profileIdentifierFromPath("/profile")).toBeNull();
    expect(profileIdentifierFromPath("/profile/")).toBeNull();
    expect(profileIdentifierFromPath("/models")).toBeNull();
  });

  it("корректно генерирует путь профиля через profilePath", () => {
    expect(profilePath()).toBe("/profile");
    expect(profilePath("maria_ai")).toBe("/profile/maria_ai");
    expect(profilePath("11111111-1111-4111-a111-111111111111")).toBe(
      "/profile/11111111-1111-4111-a111-111111111111",
    );
  });
});
