import { describe, expect, it } from "vitest";
import { isLanguage, translate } from "./messages";
import { LocalStorageDriver, STORAGE_KEYS } from "../services/storage/localStorageDriver";

describe("centralized i18n", () => {
  it("translates the same key in Russian and English", () => {
    expect(translate("ru", "auth.login.title")).toBe("Войти в VibeHub");
    expect(translate("en", "auth.login.title")).toBe("Sign in to VibeHub");
  });

  it("interpolates values and provides a stable fallback for unknown keys", () => {
    expect(translate("en", "feed.deleteTitle", { title: "Hello" })).toContain("Hello");
    expect(translate("en", "missing.translation.key")).toBe("missing.translation.key");
  });

  it("accepts only the supported language values", () => {
    expect(isLanguage("ru")).toBe(true);
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("de")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });

  it("uses the same local preference key as authenticated and anonymous UI", () => {
    expect(STORAGE_KEYS.LANGUAGE).toBe("vibehub.language");
    expect(new LocalStorageDriver()).toBeInstanceOf(LocalStorageDriver);
  });
});
