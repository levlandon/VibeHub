import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePostsRepository } from "./supabasePostsRepository";

const ISO_DATE_1 = "2026-08-20T10:00:00.000Z";
const ISO_DATE_2 = "2026-08-19T10:00:00.000Z";

function profileRow() {
  return { name: "Alice", handle: "alice", initials: "A" };
}

function postRow(id = "post-1", createdAt = ISO_DATE_1) {
  return {
    id,
    type: "discussion",
    title: `Title ${id}`,
    content: `Content ${id}`,
    created_at: createdAt,
    author: profileRow(),
    tags: ["tag1"],
    related_entities: [],
    reactions: [],
    extras: {},
  };
}

function commentRow(id = "c1", createdAt = ISO_DATE_1) {
  return {
    id,
    content: "comment",
    created_at: createdAt,
    author: profileRow(),
  };
}

interface MockCalls {
  table: string;
  select: string;
  eq: { column: string; value: string }[];
  order: { column: string; ascending: boolean; referencedTable?: string }[];
  or: string[];
  limit: number | null;
  single: boolean;
}

interface MockQueryBuilder extends PromiseLike<{ data: unknown; error: unknown | null }> {
  order(column: string, opts: { ascending: boolean; referencedTable?: string }): MockQueryBuilder;
  eq(column: string, value: string): MockQueryBuilder;
  or(filter: string): MockQueryBuilder;
  limit(count: number): MockQueryBuilder;
  single(): Promise<{ data: unknown; error: unknown | null }>;
  maybeSingle(): Promise<{ data: unknown; error: unknown | null }>;
}

function createMockClient(
  response: {
    data?: unknown;
    error?: { code: string; message: string } | null;
  } = {},
) {
  const calls: MockCalls = {
    table: "",
    select: "",
    eq: [],
    order: [],
    or: [],
    limit: null,
    single: false,
  };

  const makeBuilder = (table: string, select: string): MockQueryBuilder => {
    calls.table = table;
    calls.select = select;

    const builder: MockQueryBuilder = {
      order: (column, opts) => {
        calls.order.push({
          column,
          ascending: opts.ascending,
          referencedTable: opts.referencedTable,
        });
        return builder;
      },
      eq: (column, value) => {
        calls.eq.push({ column, value });
        return builder;
      },
      or: (filter: string) => {
        calls.or.push(filter);
        return builder;
      },
      limit: (count: number) => {
        calls.limit = count;
        return builder;
      },
      single: () => {
        calls.single = true;
        return Promise.resolve({
          data: response.data ?? null,
          error: response.error ?? null,
        });
      },
      maybeSingle: () => {
        calls.single = true;
        return Promise.resolve({
          data: response.data ?? null,
          error: response.error ?? null,
        });
      },
      then: (onfulfilled, onrejected) =>
        Promise.resolve({
          data: response.data ?? [],
          error: response.error ?? null,
        }).then(onfulfilled, onrejected),
    };

    return builder;
  };

  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn((select: string) => makeBuilder(table, select)),
    })),
  } as unknown as SupabaseClient;

  return { client, calls };
}

describe("SupabasePostsRepository", () => {
  describe("null client (demo fallback)", () => {
    it("getPosts с дефолтным INITIAL_POSTS возвращает пустую страницу без ошибок", async () => {
      const repo = new SupabasePostsRepository(null);
      const page = await repo.getPosts(undefined, 2);

      expect(page.posts).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it("getPosts с переданными fallbackPosts возвращает пагинированные страницы", async () => {
      const demoData = [
        {
          id: "p1",
          type: "discussion" as const,
          author: { name: "Alice", handle: "alice", initials: "A" },
          title: "Title 1",
          content: "Content 1",
          createdAt: "2026-08-20T10:00:00.000Z",
          tags: [],
          relatedEntities: [],
          reactions: [],
          comments: [{ id: "c1", author: { name: "A", handle: "a", initials: "A" }, content: "c", createdAt: "2026-08-20T10:00:00.000Z" }],
          extras: {},
        },
        {
          id: "p2",
          type: "discussion" as const,
          author: { name: "Bob", handle: "bob", initials: "B" },
          title: "Title 2",
          content: "Content 2",
          createdAt: "2026-08-19T10:00:00.000Z",
          tags: [],
          relatedEntities: [],
          reactions: [],
          comments: [],
          extras: {},
        },
        {
          id: "p3",
          type: "discussion" as const,
          author: { name: "Carol", handle: "carol", initials: "C" },
          title: "Title 3",
          content: "Content 3",
          createdAt: "2026-08-18T10:00:00.000Z",
          tags: [],
          relatedEntities: [],
          reactions: [],
          comments: [],
          extras: {},
        },
      ];

      const repo = new SupabasePostsRepository(null, demoData);
      const page1 = await repo.getPosts(undefined, 2);

      expect(page1.posts).toHaveLength(2);
      expect(page1.posts.map((p) => p.id)).toEqual(["p1", "p2"]);
      expect(page1.nextCursor).toEqual({
        createdAt: "2026-08-19T10:00:00.000Z",
        id: "p2",
      });

      const page2 = await repo.getPosts(page1.nextCursor ?? undefined, 2);
      expect(page2.posts).toHaveLength(1);
      expect(page2.posts[0].id).toBe("p3");
      expect(page2.nextCursor).toBeNull();

      const post1 = await repo.getPost("p1");
      expect(post1?.id).toBe("p1");

      const missing = await repo.getPost("missing");
      expect(missing).toBeNull();

      const comments = await repo.getComments("p1");
      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe("c1");
    });
  });

  describe("fluent client calls", () => {
    it("getPosts без cursor запрашивает lightweight feed (без comments), сортирует created_at/id DESC и ставит limit + 1", async () => {
      const { client, calls } = createMockClient({ data: [postRow("p1"), postRow("p2")] });
      const repo = new SupabasePostsRepository(client);

      const limit = 5;
      await repo.getPosts(undefined, limit);

      expect(client.from).toHaveBeenCalledTimes(1);
      expect(client.from).toHaveBeenCalledWith("posts");
      expect(calls.table).toBe("posts");
      expect(calls.select).toContain("author:profiles!author_id(*)");
      expect(calls.select).not.toContain("comments(*");
      expect(calls.limit).toBe(limit + 1);
      expect(calls.order).toEqual([
        { column: "created_at", ascending: false, referencedTable: undefined },
        { column: "id", ascending: false, referencedTable: undefined },
      ]);
      expect(calls.or).toHaveLength(0);
    });

    it("getPosts с cursor применяет составной .or() фильтр", async () => {
      const { client, calls } = createMockClient({ data: [postRow("p2")] });
      const repo = new SupabasePostsRepository(client);

      const cursor = { createdAt: ISO_DATE_1, id: "p1" };
      await repo.getPosts(cursor, 5);

      expect(calls.or).toHaveLength(1);
      expect(calls.or[0]).toBe(
        `created_at.lt.${ISO_DATE_1},and(created_at.eq.${ISO_DATE_1},id.lt.p1)`,
      );
    });

    it("getPost запрашивает пост со всеми комментариями и их авторами", async () => {
      const { client, calls } = createMockClient({ data: postRow("p1") });
      const repo = new SupabasePostsRepository(client);

      await repo.getPost("p1");

      expect(client.from).toHaveBeenCalledWith("posts");
      expect(calls.table).toBe("posts");
      expect(calls.select).toContain("comments:comments!post_id(*, author:profiles!author_id(*))");
      expect(calls.eq).toContainEqual({ column: "id", value: "p1" });
      expect(calls.single).toBe(true);
      expect(calls.order).toContainEqual({
        column: "created_at",
        ascending: true,
        referencedTable: "comments",
      });
    });

    it("getComments запрашивает комментарии по post_id", async () => {
      const { client, calls } = createMockClient({ data: [commentRow("c1")] });
      const repo = new SupabasePostsRepository(client);

      await repo.getComments("p1");

      expect(client.from).toHaveBeenCalledWith("comments");
      expect(calls.table).toBe("comments");
      expect(calls.select).toContain("author:profiles!author_id(*)");
      expect(calls.eq).toContainEqual({ column: "post_id", value: "p1" });
      expect(calls.order).toContainEqual({
        column: "created_at",
        ascending: true,
      });
    });
  });

  describe("cursor pagination slice & nextCursor", () => {
    it("при возврате limit + 1 элементов отсекает лишний и формирует nextCursor", async () => {
      const rows = [
        postRow("p1", ISO_DATE_1),
        postRow("p2", ISO_DATE_1),
        postRow("p3", ISO_DATE_2), // лишний 3-й элемент для limit=2
      ];
      const { client } = createMockClient({ data: rows });
      const repo = new SupabasePostsRepository(client);

      const page = await repo.getPosts(undefined, 2);

      expect(page.posts).toHaveLength(2);
      expect(page.posts.map((p) => p.id)).toEqual(["p1", "p2"]);
      expect(page.nextCursor).toEqual({
        createdAt: ISO_DATE_1,
        id: "p2",
      });
    });

    it("при возврате <= limit элементов возвращает nextCursor: null (последняя страница)", async () => {
      const rows = [postRow("p1", ISO_DATE_1), postRow("p2", ISO_DATE_2)];
      const { client } = createMockClient({ data: rows });
      const repo = new SupabasePostsRepository(client);

      const page = await repo.getPosts(undefined, 2);

      expect(page.posts).toHaveLength(2);
      expect(page.nextCursor).toBeNull();
    });

    it("пропускает невалидные строки при маппинге", async () => {
      const { client } = createMockClient({ data: [postRow("p1"), { id: "bad" }] });
      const repo = new SupabasePostsRepository(client);

      const page = await repo.getPosts(undefined, 10);

      expect(page.posts).toHaveLength(1);
      expect(page.posts[0].id).toBe("p1");
    });
  });

  describe("error handling", () => {
    it("PGRST116 для getPost возвращает null", async () => {
      const { client } = createMockClient({
        error: { code: "PGRST116", message: "No rows" },
      });
      const repo = new SupabasePostsRepository(client);

      await expect(repo.getPost("missing")).resolves.toBeNull();
    });

    it("ошибки getPosts пробрасываются", async () => {
      const { client } = createMockClient({
        error: { code: "PGRST500", message: "Internal server error" },
      });
      const repo = new SupabasePostsRepository(client);

      await expect(repo.getPosts()).rejects.toEqual(
        expect.objectContaining({ code: "PGRST500" }),
      );
    });

    it("ошибки getPost (кроме PGRST116) пробрасываются", async () => {
      const { client } = createMockClient({
        error: { code: "PGRST500", message: "Internal server error" },
      });
      const repo = new SupabasePostsRepository(client);

      await expect(repo.getPost("p1")).rejects.toEqual(
        expect.objectContaining({ code: "PGRST500" }),
      );
    });

    it("ошибки getComments пробрасываются", async () => {
      const { client } = createMockClient({
        error: { code: "PGRST500", message: "Internal server error" },
      });
      const repo = new SupabasePostsRepository(client);

      await expect(repo.getComments("p1")).rejects.toEqual(
        expect.objectContaining({ code: "PGRST500" }),
      );
    });
  });
});
