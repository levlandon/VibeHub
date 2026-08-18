import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePostsRepository } from "./supabasePostsRepository";

const ISO_DATE = "2026-08-18T10:00:00.000Z";

function profileRow() {
  return { name: "Alice", handle: "alice", initials: "A" };
}

function postRow() {
  return {
    id: "post-1",
    type: "discussion",
    title: "Title",
    content: "Content",
    created_at: ISO_DATE,
    author: profileRow(),
    tags: ["tag1"],
    related_entities: [],
    reactions: [],
    comments: [],
    extras: {},
  };
}

function commentRow() {
  return {
    id: "c1",
    content: "comment",
    created_at: ISO_DATE,
    author: profileRow(),
  };
}

interface MockCalls {
  table: string;
  select: string;
  eq: { column: string; value: string }[];
  order: { column: string; ascending: boolean; referencedTable?: string }[];
  single: boolean;
}

interface MockQueryBuilder extends PromiseLike<{ data: unknown; error: unknown | null }> {
  order(column: string, opts: { ascending: boolean; referencedTable?: string }): MockQueryBuilder;
  eq(column: string, value: string): MockQueryBuilder;
  single(): Promise<{ data: unknown; error: unknown | null }>;
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
      single: () => {
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
  describe("null client", () => {
    it("getPosts возвращает [] без throw", async () => {
      const repo = new SupabasePostsRepository(null);

      await expect(repo.getPosts()).resolves.toEqual([]);
    });

    it("getPost возвращает null без throw", async () => {
      const repo = new SupabasePostsRepository(null);

      await expect(repo.getPost("post-1")).resolves.toBeNull();
    });

    it("getComments возвращает [] без throw", async () => {
      const repo = new SupabasePostsRepository(null);

      await expect(repo.getComments("post-1")).resolves.toEqual([]);
    });
  });

  describe("fluent client calls", () => {
    it("getPosts вызывает posts.select.order с правильными параметрами", async () => {
      const { client, calls } = createMockClient();
      const repo = new SupabasePostsRepository(client);

      await repo.getPosts();

      expect(client.from).toHaveBeenCalledTimes(1);
      expect(client.from).toHaveBeenCalledWith("posts");
      expect(calls.table).toBe("posts");
      expect(calls.select).toContain("author:profiles!author_id(*)");
      expect(calls.select).toContain(
        "comments(*, author:profiles!author_id(*))",
      );
      expect(calls.order).toHaveLength(2);
      expect(calls.order).toContainEqual({
        column: "created_at",
        ascending: false,
      });
      expect(calls.order).toContainEqual({
        column: "created_at",
        ascending: true,
        referencedTable: "comments",
      });
    });

    it("getPost вызывает posts.select.order.eq.single", async () => {
      const { client, calls } = createMockClient();
      const repo = new SupabasePostsRepository(client);

      await repo.getPost("post-1");

      expect(client.from).toHaveBeenCalledWith("posts");
      expect(calls.table).toBe("posts");
      expect(calls.eq).toContainEqual({ column: "id", value: "post-1" });
      expect(calls.single).toBe(true);
      expect(calls.order).toContainEqual({
        column: "created_at",
        ascending: true,
        referencedTable: "comments",
      });
    });

    it("getComments вызывает comments.select.eq.order", async () => {
      const { client, calls } = createMockClient();
      const repo = new SupabasePostsRepository(client);

      await repo.getComments("post-1");

      expect(client.from).toHaveBeenCalledWith("comments");
      expect(calls.table).toBe("comments");
      expect(calls.select).toContain("author:profiles!author_id(*)");
      expect(calls.eq).toContainEqual({ column: "post_id", value: "post-1" });
      expect(calls.order).toContainEqual({
        column: "created_at",
        ascending: true,
      });
    });
  });

  describe("data mapping", () => {
    it("getPosts маппит строки в Post[]", async () => {
      const { client } = createMockClient({ data: [postRow()] });
      const repo = new SupabasePostsRepository(client);

      const posts = await repo.getPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe("post-1");
      expect(posts[0].type).toBe("discussion");
    });

    it("getPost маппит строку в Post", async () => {
      const { client } = createMockClient({ data: postRow() });
      const repo = new SupabasePostsRepository(client);

      const post = await repo.getPost("post-1");

      expect(post).not.toBeNull();
      expect(post?.id).toBe("post-1");
    });

    it("getComments маппит строки в PostComment[]", async () => {
      const { client } = createMockClient({ data: [commentRow()] });
      const repo = new SupabasePostsRepository(client);

      const comments = await repo.getComments("post-1");

      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe("c1");
    });

    it("пропускает невалидные строки", async () => {
      const { client } = createMockClient({ data: [postRow(), { id: "bad" }] });
      const repo = new SupabasePostsRepository(client);

      const posts = await repo.getPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe("post-1");
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

    it("другие ошибки пробрасываются из getPosts", async () => {
      const { client } = createMockClient({
        error: { code: "PGRST999", message: "fail" },
      });
      const repo = new SupabasePostsRepository(client);

      await expect(repo.getPosts()).rejects.toEqual(
        expect.objectContaining({ code: "PGRST999" }),
      );
    });

    it("другие ошибки пробрасываются из getPost", async () => {
      const { client } = createMockClient({
        error: { code: "PGRST999", message: "fail" },
      });
      const repo = new SupabasePostsRepository(client);

      await expect(repo.getPost("post-1")).rejects.toEqual(
        expect.objectContaining({ code: "PGRST999" }),
      );
    });

    it("другие ошибки пробрасываются из getComments", async () => {
      const { client } = createMockClient({
        error: { code: "PGRST999", message: "fail" },
      });
      const repo = new SupabasePostsRepository(client);

      await expect(repo.getComments("post-1")).rejects.toEqual(
        expect.objectContaining({ code: "PGRST999" }),
      );
    });
  });
});
