import { describe, expect, it } from "vitest";
import { formatFullDate, formatModelDate } from "./dateFormat";

describe("dateFormat", () => {
  describe("formatModelDate", () => {
    it("форматирует дату текущего года компактно (без указания года)", () => {
      expect(formatModelDate("2026-08-14", 2026)).toBe("14 авг.");
      expect(formatModelDate("2026-09-05", 2026)).toBe("5 сен.");
      expect(formatModelDate("2026-05-12", 2026)).toBe("12 мая");
      expect(formatModelDate("2026-07-15", 2026)).toBe("15 июля");
      expect(formatModelDate("2026-06-22", 2026)).toBe("22 июня");
      expect(formatModelDate("2026-01-01", 2026)).toBe("1 янв.");
    });

    it("форматирует дату другого года с указанием года", () => {
      expect(formatModelDate("2025-08-14", 2026)).toBe("14 авг. 2025");
      expect(formatModelDate("2024-09-05", 2026)).toBe("5 сен. 2024");
      expect(formatModelDate("2024-12-31", 2026)).toBe("31 дек. 2024");
    });

    it("обрабатывает timestamp и объект Date", () => {
      const date = new Date(2026, 7, 14); // 14 Aug 2026
      expect(formatModelDate(date.getTime(), 2026)).toBe("14 авг.");
      expect(formatModelDate(date, 2026)).toBe("14 авг.");
    });

    it("возвращает пустую строку для невалидных данных", () => {
      expect(formatModelDate(null)).toBe("");
      expect(formatModelDate(undefined)).toBe("");
      expect(formatModelDate("invalid-date")).toBe("");
    });
  });

  describe("formatFullDate", () => {
    it("форматирует полную дату для тултипа", () => {
      expect(formatFullDate("2026-08-14")).toBe("14 августа 2026");
      expect(formatFullDate("2025-01-05")).toBe("5 января 2025");
      expect(formatFullDate("2024-05-09")).toBe("9 мая 2024");
    });

    it("возвращает пустую строку для невалидных данных", () => {
      expect(formatFullDate(null)).toBe("");
      expect(formatFullDate(undefined)).toBe("");
      expect(formatFullDate("not-a-date")).toBe("");
    });
  });
});
