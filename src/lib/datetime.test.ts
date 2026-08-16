import { describe, expect, it } from "vitest";
import { formatDateTime } from "./datetime";

describe("formatDateTime", () => {
  it("форматирует ISO-дату в локальном часовом поясе", () => {
    const iso = "2026-08-16T13:35:00.000Z";
    const date = new Date(iso);
    const localTime = `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
    expect(formatDateTime(iso)).toContain(localTime);
  });

  it("для не-ISO строк возвращает исходную строку", () => {
    expect(formatDateTime("сейчас")).toBe("сейчас");
  });

  it("для пустой строки возвращает пустую строку", () => {
    expect(formatDateTime("")).toBe("");
  });
});
