import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SupabaseBookmarksRepository } from "./supabaseBookmarksRepository";
import { SupabaseCollectionsRepository } from "./supabaseCollectionsRepository";
import { LocalStorageBookmarksRepository } from "./localStorageBookmarksRepository";
import { LocalStorageCollectionsRepository } from "./localStorageCollectionsRepository";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("Supabase Saved Items & Collections Integration Tests (RLS, Multi-User Isolation, Account Switching)", () => {
  // Client A for User A (alex@vibehub.dev)
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const bookmarksRepoA = new SupabaseBookmarksRepository(
    clientA,
    new LocalStorageBookmarksRepository(),
  );
  const collectionsRepoA = new SupabaseCollectionsRepository(
    clientA,
    new LocalStorageCollectionsRepository(),
  );

  // Client B for User B (maria@vibehub.dev)
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const bookmarksRepoB = new SupabaseBookmarksRepository(
    clientB,
    new LocalStorageBookmarksRepository(),
  );
  const collectionsRepoB = new SupabaseCollectionsRepository(
    clientB,
    new LocalStorageCollectionsRepository(),
  );

  it("Scenario 1: User A Saved & Collections full CRUD lifecycle", async () => {
    // 1. Auth as User A
    const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
      email: "alex@vibehub.dev",
      password: "password123",
    });
    expect(errA).toBeNull();
    expect(authA.user?.id).toBe("11111111-1111-4111-a111-111111111111");

    // 2. Initial Bookmarks for User A
    const bookmarks = await bookmarksRepoA.getBookmarks();
    expect(bookmarks.length).toBeGreaterThanOrEqual(3);
    expect(bookmarks.some((b) => b.kind === "model" && b.targetId === "anthropic/claude-3.7-sonnet")).toBe(true);
    expect(bookmarks.some((b) => b.kind === "tool" && b.targetId === "cursor")).toBe(true);
    expect(bookmarks.some((b) => b.kind === "repository" && b.targetId === "facebook/react")).toBe(true);

    // 3. Save new bookmark
    const newBookmark = await bookmarksRepoA.saveBookmark({
      kind: "model",
      targetId: "google/gemini-2.0-flash",
      title: "Gemini 2.0 Flash",
      subtitle: "Google",
    });
    expect(newBookmark.id).toBeDefined();

    const bookmarksAfterAdd = await bookmarksRepoA.getBookmarks();
    expect(bookmarksAfterAdd.some((b) => b.targetId === "google/gemini-2.0-flash")).toBe(true);

    // 4. Duplicate save is idempotent
    await bookmarksRepoA.saveBookmark({
      kind: "model",
      targetId: "google/gemini-2.0-flash",
      title: "Gemini 2.0 Flash",
      subtitle: "Google",
    });
    const bookmarksAfterDup = await bookmarksRepoA.getBookmarks();
    const geminiCount = bookmarksAfterDup.filter((b) => b.targetId === "google/gemini-2.0-flash").length;
    expect(geminiCount).toBe(1);

    // 5. Remove bookmark
    const removed = await bookmarksRepoA.removeBookmark("model", "google/gemini-2.0-flash");
    expect(removed).toBe(true);
    const bookmarksAfterRemove = await bookmarksRepoA.getBookmarks();
    expect(bookmarksAfterRemove.some((b) => b.targetId === "google/gemini-2.0-flash")).toBe(false);

    // 5b. Save & Remove Post Bookmark
    await bookmarksRepoA.saveBookmark({
      kind: "post",
      targetId: "post-test-1",
      title: "Integration Test Post",
      subtitle: "Обсуждение",
    });
    const bookmarksWithPost = await bookmarksRepoA.getBookmarks();
    expect(bookmarksWithPost.some((b) => b.kind === "post" && b.targetId === "post-test-1")).toBe(true);
    await bookmarksRepoA.removeBookmark("post", "post-test-1");

    // 5c. Save & Remove Comment Bookmark
    await bookmarksRepoA.saveBookmark({
      kind: "comment",
      targetId: "comment-test-1",
      title: "Integration Test Comment",
      subtitle: "Integration Test Post",
      postId: "post-test-1",
      commentId: "comment-test-1",
    });
    const bookmarksWithComment = await bookmarksRepoA.getBookmarks();
    expect(bookmarksWithComment.some((b) => b.kind === "comment" && b.targetId === "comment-test-1")).toBe(true);
    await bookmarksRepoA.removeBookmark("comment", "comment-test-1");

    // 6. Collections CRUD
    const collections = await collectionsRepoA.getCollections();
    expect(collections.length).toBeGreaterThanOrEqual(1);
    const aiStack = collections.find((c) => c.name === "AI Stack");
    expect(aiStack).toBeDefined();
    expect(aiStack?.items.length).toBe(3);

    // Create a new collection
    const createdCol = await collectionsRepoA.createCollection({
      name: "Integration Test Col",
      description: "Temporary collection for testing",
    });
    expect(createdCol.name).toBe("Integration Test Col");
    expect(createdCol.items).toEqual([]);

    // Add item to collection
    const addedItem = await collectionsRepoA.addItem(createdCol.id, {
      url: "https://v0.dev",
      title: "v0 by Vercel",
      description: "Generative UI",
    });
    expect(addedItem.title).toBe("v0 by Vercel");
    expect(addedItem.domain).toBe("v0.dev");

    // Verify item appears in collection
    const colWithItem = await collectionsRepoA.getCollection(createdCol.id);
    expect(colWithItem?.items.length).toBe(1);
    expect(colWithItem?.items[0].url).toBe("https://v0.dev/");

    // Update item
    const updatedItem = await collectionsRepoA.updateItem(createdCol.id, addedItem.id, {
      title: "v0 (Updated Title)",
    });
    expect(updatedItem.title).toBe("v0 (Updated Title)");

    // Delete collection (cascades to items)
    const deletedCol = await collectionsRepoA.deleteCollection(createdCol.id);
    expect(deletedCol).toBe(true);

    const checkDeleted = await collectionsRepoA.getCollection(createdCol.id);
    expect(checkDeleted).toBeNull();
  });

  it("Scenario 2: Multi-User Isolation & RLS Security (User A vs User B)", async () => {
    // Authenticate User A
    await clientA.auth.signInWithPassword({
      email: "alex@vibehub.dev",
      password: "password123",
    });

    // Authenticate User B
    const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
      email: "maria@vibehub.dev",
      password: "password123",
    });
    expect(errB).toBeNull();
    expect(authB.user?.id).toBe("22222222-2222-4222-a222-222222222222");

    // 1. User B sees only own bookmarks (DeepSeek R1, post 16) and none of User A's
    const bookmarksB = await bookmarksRepoB.getBookmarks();
    expect(bookmarksB.some((b) => b.targetId === "deepseek/deepseek-r1")).toBe(true);
    expect(bookmarksB.some((b) => b.targetId === "anthropic/claude-3.7-sonnet")).toBe(false);
    expect(bookmarksB.some((b) => b.targetId === "cursor")).toBe(false);

    // 2. User B sees only own collections (Research & Benchmarks) and not AI Stack
    const collectionsB = await collectionsRepoB.getCollections();
    expect(collectionsB.some((c) => c.name === "Research & Benchmarks")).toBe(true);
    expect(collectionsB.some((c) => c.name === "AI Stack")).toBe(false);

    // 3. User B cannot read User A's collection by direct ID
    const alexColDirect = await collectionsRepoB.getCollection("e0000001-0000-0000-0000-000000000001");
    expect(alexColDirect).toBeNull();

    // 4. User B cannot add item to User A's collection
    await expect(
      collectionsRepoB.addItem("e0000001-0000-0000-0000-000000000001", {
        url: "https://hacker.com",
      }),
    ).rejects.toBeDefined();

    // 5. User B cannot delete User A's bookmark
    await bookmarksRepoB.removeBookmark("model", "anthropic/claude-3.7-sonnet");
    // Verify User A's bookmark is still present
    const bookmarksA = await bookmarksRepoA.getBookmarks();
    expect(bookmarksA.some((b) => b.targetId === "anthropic/claude-3.7-sonnet")).toBe(true);
  });

  it("Scenario 3: Account switch A -> B -> A with zero stale data or state leaks", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const bookmarksRepo = new SupabaseBookmarksRepository(
      client,
      new LocalStorageBookmarksRepository(),
    );
    const collectionsRepo = new SupabaseCollectionsRepository(
      client,
      new LocalStorageCollectionsRepository(),
    );

    // 1. Sign in as Alex
    await client.auth.signInWithPassword({
      email: "alex@vibehub.dev",
      password: "password123",
    });
    const alexBookmarks = await bookmarksRepo.getBookmarks();
    const alexCols = await collectionsRepo.getCollections();

    expect(alexBookmarks.some((b) => b.targetId === "anthropic/claude-3.7-sonnet")).toBe(true);
    expect(alexCols.some((c) => c.name === "AI Stack")).toBe(true);

    // 2. Sign out and sign in as Maria
    await client.auth.signOut();
    await client.auth.signInWithPassword({
      email: "maria@vibehub.dev",
      password: "password123",
    });

    const mariaBookmarks = await bookmarksRepo.getBookmarks();
    const mariaCols = await collectionsRepo.getCollections();

    expect(mariaBookmarks.some((b) => b.targetId === "anthropic/claude-3.7-sonnet")).toBe(false);
    expect(mariaBookmarks.some((b) => b.targetId === "deepseek/deepseek-r1")).toBe(true);
    expect(mariaCols.some((c) => c.name === "AI Stack")).toBe(false);
    expect(mariaCols.some((c) => c.name === "Research & Benchmarks")).toBe(true);

    // 3. Sign out and sign in back as Alex
    await client.auth.signOut();
    await client.auth.signInWithPassword({
      email: "alex@vibehub.dev",
      password: "password123",
    });

    const alexBookmarks2 = await bookmarksRepo.getBookmarks();
    const alexCols2 = await collectionsRepo.getCollections();

    expect(alexBookmarks2.length).toBe(alexBookmarks.length);
    expect(alexBookmarks2.some((b) => b.targetId === "anthropic/claude-3.7-sonnet")).toBe(true);
    expect(alexCols2.some((c) => c.name === "AI Stack")).toBe(true);
    expect(alexCols2.some((c) => c.name === "Research & Benchmarks")).toBe(false);
  });
});
