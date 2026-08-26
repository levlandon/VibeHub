import { describe, expect, it } from "vitest";
import {
  buildPostgrestCursorFilter,
  comparePostsDesc,
  isAfterCursor,
  paginateInMemory,
} from "./pagination";

describe("pagination helpers", () => {
  describe("comparePostsDesc", () => {
    it("сортирует по createdAt по убыванию", () => {
      const a = { id: "1", createdAt: "2026-08-20T10:00:00.000Z" };
      const b = { id: "2", createdAt: "2026-08-21T10:00:00.000Z" };
      expect(comparePostsDesc(a, b)).toBeGreaterThan(0);
      expect(comparePostsDesc(b, a)).toBeLessThan(0);
    });

    it("при одинаковых createdAt использует tiebreaker id по убыванию", () => {
      const a = { id: "post-a", createdAt: "2026-08-20T10:00:00.000Z" };
      const b = { id: "post-b", createdAt: "2026-08-20T10:00:00.000Z" };
      expect(comparePostsDesc(a, b)).toBeGreaterThan(0);
      expect(comparePostsDesc(b, a)).toBeLessThan(0);
    });
  });

  describe("isAfterCursor", () => {
    const cursor = {
      createdAt: "2026-08-20T10:00:00.000Z",
      id: "post-m",
    };

    it("возвращает true для более старой даты", () => {
      const older = { id: "post-z", createdAt: "2026-08-19T10:00:00.000Z" };
      expect(isAfterCursor(older, cursor)).toBe(true);
    });

    it("возвращает false для более новой даты", () => {
      const newer = { id: "post-a", createdAt: "2026-08-21T10:00:00.000Z" };
      expect(isAfterCursor(newer, cursor)).toBe(false);
    });

    it("при одинаковой дате возвращает true только если id < cursor.id", () => {
      const smallerId = { id: "post-a", createdAt: "2026-08-20T10:00:00.000Z" };
      const largerId = { id: "post-z", createdAt: "2026-08-20T10:00:00.000Z" };
      const sameId = { id: "post-m", createdAt: "2026-08-20T10:00:00.000Z" };

      expect(isAfterCursor(smallerId, cursor)).toBe(true);
      expect(isAfterCursor(largerId, cursor)).toBe(false);
      expect(isAfterCursor(sameId, cursor)).toBe(false);
    });
  });

  describe("buildPostgrestCursorFilter", () => {
    it("строит корректную строку составного фильтра .or()", () => {
      const cursor = {
        createdAt: "2026-08-20T10:00:00.000Z",
        id: "abc-123",
      };
      const filter = buildPostgrestCursorFilter(cursor);
      expect(filter).toBe(
        "created_at.lt.2026-08-20T10:00:00.000Z,and(created_at.eq.2026-08-20T10:00:00.000Z,id.lt.abc-123)",
      );
    });
  });

  describe("paginateInMemory", () => {
    const items = [
      { id: "p1", createdAt: "2026-08-20T10:00:00.000Z" },
      { id: "p2", createdAt: "2026-08-20T10:00:00.000Z" },
      { id: "p3", createdAt: "2026-08-21T10:00:00.000Z" },
      { id: "p4", createdAt: "2026-08-22T10:00:00.000Z" },
      { id: "p5", createdAt: "2026-08-23T10:00:00.000Z" },
    ];

    it("возвращает первую страницу и nextCursor при limit < total", () => {
      const page1 = paginateInMemory(items, undefined, 2);

      expect(page1.items).toHaveLength(2);
      expect(page1.items[0].id).toBe("p5");
      expect(page1.items[1].id).toBe("p4");
      expect(page1.nextCursor).toEqual({
        createdAt: "2026-08-22T10:00:00.000Z",
        id: "p4",
      });
    });

    it("возвращает следующую страницу по cursor без пересечений и пропусков", () => {
      const page1 = paginateInMemory(items, undefined, 2);
      const page2 = paginateInMemory(items, page1.nextCursor, 2);

      expect(page2.items).toHaveLength(2);
      expect(page2.items[0].id).toBe("p3");
      expect(page2.items[1].id).toBe("p2");
      expect(page2.nextCursor).toEqual({
        createdAt: "2026-08-20T10:00:00.000Z",
        id: "p2",
      });

      const page3 = paginateInMemory(items, page2.nextCursor, 2);
      expect(page3.items).toHaveLength(1);
      expect(page3.items[0].id).toBe("p1");
      expect(page3.nextCursor).toBeNull();
    });

    it("возвращает пустой список если элементов нет", () => {
      const page = paginateInMemory([], undefined, 10);
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });
  });
});
