import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SupabasePostsRepository } from "./supabasePostsRepository";

import type { Post } from "../../types/posts";
import type { PostsCursor } from "./types";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("SupabasePostsRepository Integration Tests (Live Local Supabase)", () => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const repository = new SupabasePostsRepository(client);

  it("1. getPosts() loads first page with author and without comments (lightweight LIST)", async () => {
    const page = await repository.getPosts(undefined, 5);

    expect(page.posts).toHaveLength(5);
    expect(page.nextCursor).not.toBeNull();
    expect(page.nextCursor?.createdAt).toBeDefined();
    expect(page.nextCursor?.id).toBeDefined();

    // Verify all posts have author mapped and comments are empty array (not fetched in list)
    for (const post of page.posts) {
      expect(post.author).toBeDefined();
      expect(post.author.name).toBeTruthy();
      expect(post.comments).toEqual([]);
    }
  });

  it("2. Cursor pagination traverses entire database deterministically without duplicates or missing posts", async () => {
    const allFetchedPosts: Post[] = [];
    let cursor: PostsCursor | undefined = undefined;
    let pageCount = 0;

    while (true) {
      pageCount++;
      const page = await repository.getPosts(cursor, 5);
      allFetchedPosts.push(...page.posts);

      if (!page.nextCursor) {
        break;
      }
      cursor = page.nextCursor;
    }

    // Seed data has 16 posts
    expect(allFetchedPosts.length).toBe(16);
    expect(pageCount).toBe(4); // 5 + 5 + 5 + 1 = 16 (4 pages)

    // Check no duplicate IDs
    const ids = allFetchedPosts.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(16);

    // Verify descending sort order across the entire list (created_at DESC, id DESC)
    for (let i = 0; i < allFetchedPosts.length - 1; i++) {
      const current = allFetchedPosts[i];
      const next = allFetchedPosts[i + 1];

      const currentTime = new Date(current.createdAt).getTime();
      const nextTime = new Date(next.createdAt).getTime();

      if (currentTime === nextTime) {
        expect(current.id.localeCompare(next.id)).toBeGreaterThan(0);
      } else {
        expect(currentTime).toBeGreaterThan(nextTime);
      }
    }
  });

  it("3. Deterministic tiebreaker on identical created_at timestamps", async () => {
    // Posts 4 and 5 share timestamp '2026-08-25 14:00:00+00'
    // id '...0005' > '...0004', so ...0005 must precede ...0004
    const page = await repository.getPosts(undefined, 20);
    const post4 = page.posts.find((p) => p.id === "a0000001-0000-0000-0000-000000000004");
    const post5 = page.posts.find((p) => p.id === "a0000001-0000-0000-0000-000000000005");

    expect(post4).toBeDefined();
    expect(post5).toBeDefined();
    expect(post4?.createdAt).toEqual(post5?.createdAt);

    const index4 = page.posts.indexOf(post4!);
    const index5 = page.posts.indexOf(post5!);
    expect(index5).toBeLessThan(index4);
  });

  it("4. getPost(id) loads full detail including comments and comment authors", async () => {
    const post = await repository.getPost("a0000001-0000-0000-0000-000000000001");

    expect(post).not.toBeNull();
    expect(post?.id).toBe("a0000001-0000-0000-0000-000000000001");
    expect(post?.author.name).toBe("Алексей Смирнов");
    expect(post?.comments.length).toBe(2);
    expect(post?.comments[0].author.name).toBe("Мария Иванова");
    expect(post?.comments[1].author.name).toBe("Дмитрий Козлов");
  });

  it("5. getPost(id) returns null for non-existent id", async () => {
    const post = await repository.getPost("00000000-0000-0000-0000-000000000000");
    expect(post).toBeNull();
  });

  it("6. getComments(postId) loads comments separately in created_at ASC order", async () => {
    const comments = await repository.getComments("a0000001-0000-0000-0000-000000000001");

    expect(comments).toHaveLength(2);
    expect(comments[0].content).toBe(
      "Отличный обзор! Особенно впечатляет скорость размышления в hybrid mode.",
    );
    expect(comments[1].content).toBe(
      "Протестировал на рефакторинге большого TypeScript-проекта — результаты впечатляющие.",
    );
    expect(
      new Date(comments[0].createdAt).getTime(),
    ).toBeLessThanOrEqual(new Date(comments[1].createdAt).getTime());
  });

  it("7. getComments(postId) returns empty array for post without comments", async () => {
    const comments = await repository.getComments("a0000001-0000-0000-0000-000000000002");
    expect(comments).toEqual([]);
  });
});
