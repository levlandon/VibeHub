import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetchWithTimeout";

describe("fetchWithTimeout", () => {
  afterEach(() => vi.restoreAllMocks());

  it("завершает зависший запрос по timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    await expect(fetchWithTimeout("https://example.test", {}, 5)).rejects.toThrow(
      "Внешний сервис не ответил",
    );
  });
});
