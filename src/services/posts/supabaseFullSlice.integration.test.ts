import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SupabasePostsRepository } from "./supabasePostsRepository";
import { SupabaseProfileRepository } from "../profile/supabaseProfileRepository";
import { LocalStorageProfileRepository } from "../profile/profileRepository";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("Supabase Full Slice Integration Tests (Auth, Profile, Posts, Comments, RLS)", () => {
  // Client A for User A (alex@vibehub.dev)
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const repoA = new SupabasePostsRepository(clientA);
  const profileRepoA = new SupabaseProfileRepository(
    clientA,
    new LocalStorageProfileRepository(),
  );

  // Client B for User B (maria@vibehub.dev)
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const repoB = new SupabasePostsRepository(clientB);
  const profileRepoB = new SupabaseProfileRepository(
    clientB,
    new LocalStorageProfileRepository(),
  );

  it("Scenario A: User A full lifecycle (Auth, Profile, Post CRUD, Comment CRUD)", async () => {
    // 1. User A authentication
    const { data: authDataA, error: authErrA } =
      await clientA.auth.signInWithPassword({
        email: "alex@vibehub.dev",
        password: "password123",
      });
    expect(authErrA).toBeNull();
    expect(authDataA.user).toBeDefined();
    expect(authDataA.user?.id).toBe("11111111-1111-4111-a111-111111111111");

    // 2. Profile A exists and can be retrieved with all public fields
    const profileA = await profileRepoA.getProfile(authDataA.user?.id);
    expect(profileA).not.toBeNull();
    expect(profileA?.displayName).toBe("Алексей Смирнов");
    expect(profileA?.username).toBe("alex_dev");
    expect(profileA?.bio).toContain("Frontend Lead");
    expect(profileA?.avatarUrl).toContain("unsplash.com");
    expect(profileA?.modelIds).toEqual(["anthropic/claude-3.7-sonnet", "openai/gpt-4o"]);
    expect(profileA?.interests).toEqual(["Coding", "Design", "Product"]);

    // Profile A update works for own profile (all fields)
    const updateResult = await profileRepoA.saveProfile({
      ...profileA!,
      displayName: "Алексей Смирнов (Updated)",
      bio: "Обновленное био Алексея",
      modelIds: ["anthropic/claude-3.7-sonnet"],
      interests: ["Coding", "Automation"],
    });
    expect(updateResult).toBe(true);

    const updatedProfileA = await profileRepoA.getProfile(authDataA.user?.id);
    expect(updatedProfileA?.displayName).toBe("Алексей Смирнов (Updated)");
    expect(updatedProfileA?.bio).toBe("Обновленное био Алексея");
    expect(updatedProfileA?.modelIds).toEqual(["anthropic/claude-3.7-sonnet"]);
    expect(updatedProfileA?.interests).toEqual(["Coding", "Automation"]);

    // Restore original profile fields
    await profileRepoA.saveProfile({
      ...profileA!,
      displayName: "Алексей Смирнов",
      bio: "Frontend Lead & AI enthusiast. Строю интерфейсы нового поколения на React и LLM.",
      modelIds: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
      interests: ["Coding", "Design", "Product"],
    });

    // 3. User A creates post
    const createdPost = await repoA.createPost({
      type: "question",
      title: "Integration Test Post by User A",
      content: "Initial content for test post",
      tags: ["integration", "vitest"],
      extras: { source: "test-suite" },
    });
    expect(createdPost.id).toBeDefined();
    expect(createdPost.title).toBe("Integration Test Post by User A");
    expect(createdPost.author.handle).toBe("alex_dev");
    expect(createdPost.author.id).toBe("11111111-1111-4111-a111-111111111111");

    // Anonymous can fetch User A public profile by ID and by handle with complete parity
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const anonProfileRepo = new SupabaseProfileRepository(
      anonClient,
      new LocalStorageProfileRepository(),
    );
    const pubProfileById = await anonProfileRepo.getProfile(
      "11111111-1111-4111-a111-111111111111",
    );
    expect(pubProfileById).not.toBeNull();
    expect(pubProfileById?.displayName).toBe("Алексей Смирнов");
    expect(pubProfileById?.username).toBe("alex_dev");
    expect(pubProfileById?.bio).toBe(profileA?.bio);
    expect(pubProfileById?.avatarUrl).toBe(profileA?.avatarUrl);
    expect(pubProfileById?.modelIds).toEqual(profileA?.modelIds);
    expect(pubProfileById?.interests).toEqual(profileA?.interests);

    const pubProfileByHandle = await anonProfileRepo.getProfile("alex_dev");
    expect(pubProfileByHandle).not.toBeNull();
    expect(pubProfileByHandle?.id).toBe("11111111-1111-4111-a111-111111111111");
    expect(pubProfileByHandle?.displayName).toBe("Алексей Смирнов");
    expect(pubProfileByHandle?.bio).toBe(profileA?.bio);
    expect(pubProfileByHandle?.avatarUrl).toBe(profileA?.avatarUrl);
    expect(pubProfileByHandle?.modelIds).toEqual(profileA?.modelIds);
    expect(pubProfileByHandle?.interests).toEqual(profileA?.interests);

    // 4. Post is readable via read repository
    const fetchedPost = await repoA.getPost(createdPost.id);
    expect(fetchedPost).not.toBeNull();
    expect(fetchedPost?.id).toBe(createdPost.id);
    expect(fetchedPost?.content).toBe("Initial content for test post");

    // 5. User A updates own post
    const updatedPost = await repoA.updatePost(createdPost.id, {
      title: "Updated Title by User A",
      content: "Updated content for test post",
    });
    expect(updatedPost.title).toBe("Updated Title by User A");
    expect(updatedPost.content).toBe("Updated content for test post");

    // 6. Change is really persisted in database
    const verifyUpdatedPost = await repoA.getPost(createdPost.id);
    expect(verifyUpdatedPost?.title).toBe("Updated Title by User A");
    expect(verifyUpdatedPost?.content).toBe("Updated content for test post");

    // 7. User A adds comment to own post
    const comment = await repoA.createComment(
      createdPost.id,
      "Comment by User A on own post",
    );
    expect(comment.id).toBeDefined();
    expect(comment.content).toBe("Comment by User A on own post");
    expect(comment.author.handle).toBe("alex_dev");

    // 7b. User A adds reply with parentCommentId & replyToCommentId
    const reply = await repoA.createComment(
      createdPost.id,
      "Reply by User A to own root comment",
      comment.id,
      comment.id,
    );
    expect(reply.id).toBeDefined();
    expect(reply.parentCommentId).toBe(comment.id);
    expect(reply.replyToCommentId).toBe(comment.id);

    // 7c. Reject reply targeting a comment from another post (FK trigger integrity)
    await expect(
      repoA.createComment(
        createdPost.id,
        "Illegal cross-post reply",
        "b0000001-0000-0000-0000-000000000001", // comment belonging to seed post 1
      ),
    ).rejects.toBeDefined();

    // 8. Comment and reply appear via getComments and getPost
    const commentsList = await repoA.getComments(createdPost.id);
    expect(commentsList.some((c) => c.id === comment.id)).toBe(true);
    const fetchedReply = commentsList.find((c) => c.id === reply.id);
    expect(fetchedReply?.parentCommentId).toBe(comment.id);
    expect(fetchedReply?.replyToCommentId).toBe(comment.id);

    const postWithComments = await repoA.getPost(createdPost.id);
    expect(
      postWithComments?.comments.some((c) => c.id === comment.id),
    ).toBe(true);
    expect(
      postWithComments?.comments.find((c) => c.id === reply.id)?.parentCommentId,
    ).toBe(comment.id);
    expect(
      postWithComments?.comments.find((c) => c.id === reply.id)?.replyToCommentId,
    ).toBe(comment.id);

    // 9. User A updates own comment
    const updatedComment = await repoA.updateComment(
      comment.id,
      "Updated comment content by User A",
    );
    expect(updatedComment.content).toBe("Updated comment content by User A");

    const acceptedQuestion = await repoA.acceptAnswer({
      postId: createdPost.id,
      commentId: comment.id,
    });
    expect(acceptedQuestion.acceptedAnswerId).toBe(comment.id);
    expect((await repoA.getPost(createdPost.id))?.acceptedAnswerId).toBe(comment.id);

    // 10. User A deletes own comment (soft delete to preserve thread structure)
    await repoA.deleteComment({ postId: createdPost.id, commentId: comment.id });
    const commentsAfterDelete = await repoA.getComments(createdPost.id);
    const deletedComment = commentsAfterDelete.find((c) => c.id === comment.id);
    expect(deletedComment?.deletedAt).toBeTruthy();
    expect(deletedComment?.content).toBe("");
    const questionAfterAnswerDelete = await repoA.getPost(createdPost.id);
    expect(questionAfterAnswerDelete?.acceptedAnswerId).toBeUndefined();
    expect(questionAfterAnswerDelete?.solved).toBe(false);

    // 11. User A deletes own post
    await repoA.deletePost(createdPost.id);
    const postAfterDelete = await repoA.getPost(createdPost.id);
    expect(postAfterDelete).toBeNull();
  });

  it("Scenario B: Multi-user permissions and RLS protection (User A vs User B)", async () => {
    // Authenticate User A
    await clientA.auth.signInWithPassword({
      email: "alex@vibehub.dev",
      password: "password123",
    });

    // Authenticate User B
    const { data: authDataB, error: authErrB } =
      await clientB.auth.signInWithPassword({
        email: "maria@vibehub.dev",
        password: "password123",
      });
    expect(authErrB).toBeNull();
    expect(authDataB.user?.id).toBe("22222222-2222-4222-a222-222222222222");

    // Verify User B profile has distinct data
    const profileB = await profileRepoB.getProfile(authDataB.user?.id);
    expect(profileB).not.toBeNull();
    expect(profileB?.displayName).toBe("Мария Иванова");
    expect(profileB?.username).toBe("maria_ai");
    expect(profileB?.bio).toContain("AI Researcher");
    expect(profileB?.modelIds).toEqual([
      "deepseek/deepseek-r1",
      "google/gemini-2.0-flash",
      "anthropic/claude-3.7-sonnet",
    ]);
    expect(profileB?.interests).toBeDefined();
    expect(profileB?.interests?.length).toBeGreaterThan(0);

    // 1. User A creates a post
    const postA = await repoA.createPost({
      type: "guide",
      title: "Shared post by User A",
      content: "Public content for testing multi-user protection",
      tags: ["security"],
      extras: {},
    });

    // 2. User B reads User A's post
    const postReadByB = await repoB.getPost(postA.id);
    expect(postReadByB).not.toBeNull();
    expect(postReadByB?.title).toBe("Shared post by User A");
    expect(postReadByB?.author.handle).toBe("alex_dev");

    // 3. User B attempts to edit User A's post -> rejected by RLS (single() returns PGRST116 when 0 rows match update)
    await expect(
      repoB.updatePost(postA.id, {
        title: "Maliciously edited title by User B",
      }),
    ).rejects.toBeDefined();

    // Verify post A is untouched
    const postAfterFailedEdit = await repoA.getPost(postA.id);
    expect(postAfterFailedEdit?.title).toBe("Shared post by User A");

    // 4. User B attempts to delete User A's post -> RLS blocks delete (0 rows deleted, post remains)
    await repoB.deletePost(postA.id);
    const postAfterFailedDelete = await repoA.getPost(postA.id);
    expect(postAfterFailedDelete).not.toBeNull();

    // 5. User B creates a comment on User A's post
    const commentB = await repoB.createComment(
      postA.id,
      "Comment by User B on Post A",
    );
    expect(commentB.author.handle).toBe("maria_ai");

    // User A can read User B's comment
    const commentsOnPostA = await repoA.getComments(postA.id);
    expect(commentsOnPostA.some((c) => c.id === commentB.id)).toBe(true);

    // 6. User A attempts to edit User B's comment -> rejected by RLS
    await expect(
      repoA.updateComment(commentB.id, "Maliciously modified comment by User A"),
    ).rejects.toBeDefined();

    // User A attempts to delete User B's comment -> RLS blocks (comment remains)
    await expect(
      repoA.deleteComment({ postId: postA.id, commentId: commentB.id }),
    ).rejects.toBeDefined();
    const commentsAfterFailedDelete = await repoA.getComments(postA.id);
    expect(commentsAfterFailedDelete.some((c) => c.id === commentB.id)).toBe(
      true,
    );

    // 7. User B attempts to update User A's profile (including bio, avatar, models, interests) -> blocked / no effect
    const profileAOriginal = await profileRepoA.getProfile("11111111-1111-4111-a111-111111111111");
    expect(profileAOriginal).not.toBeNull();
    await profileRepoB.saveProfile({
      ...profileAOriginal!,
      id: "11111111-1111-4111-a111-111111111111",
      displayName: "Hacked by User B",
      bio: "Hacked Bio",
      avatarUrl: "https://example.com/hacked.png",
      modelIds: ["hacked/model"],
      interests: ["Hacking"],
    });
    const profileAfterHackAttempt = await profileRepoA.getProfile("11111111-1111-4111-a111-111111111111");
    expect(profileAfterHackAttempt?.displayName).toBe("Алексей Смирнов");
    expect(profileAfterHackAttempt?.bio).toBe(profileAOriginal?.bio);
    expect(profileAfterHackAttempt?.avatarUrl).toBe(profileAOriginal?.avatarUrl);
    expect(profileAfterHackAttempt?.modelIds).toEqual(profileAOriginal?.modelIds);
    expect(profileAfterHackAttempt?.interests).toEqual(profileAOriginal?.interests);

    // Clean up: User B deletes own comment, User A deletes own post
    await repoB.deleteComment({ postId: postA.id, commentId: commentB.id });
    await repoA.deletePost(postA.id);

    const finalPost = await repoA.getPost(postA.id);
    expect(finalPost).toBeNull();
  });

  it("Scenario C: Account switch A -> B -> A without data leakage", async () => {
    // Single client switching users
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const repo = new SupabaseProfileRepository(
      client,
      new LocalStorageProfileRepository(),
    );

    // 1. Sign in as Alex
    const { data: authA } = await client.auth.signInWithPassword({
      email: "alex@vibehub.dev",
      password: "password123",
    });
    const alexProfile = await repo.getProfile(authA.user?.id);
    expect(alexProfile).not.toBeNull();
    expect(alexProfile?.displayName).toBe("Алексей Смирнов");
    expect(alexProfile?.username).toBe("alex_dev");
    expect(alexProfile?.modelIds).toEqual(["anthropic/claude-3.7-sonnet", "openai/gpt-4o"]);
    expect(alexProfile?.interests).toEqual(["Coding", "Design", "Product"]);

    // 2. Sign out and sign in as Maria
    await client.auth.signOut();
    const { data: authB } = await client.auth.signInWithPassword({
      email: "maria@vibehub.dev",
      password: "password123",
    });
    const mariaProfile = await repo.getProfile(authB.user?.id);
    expect(mariaProfile).not.toBeNull();
    expect(mariaProfile?.displayName).toBe("Мария Иванова");
    expect(mariaProfile?.username).toBe("maria_ai");
    expect(mariaProfile?.avatarUrl).not.toBe(alexProfile?.avatarUrl);
    expect(mariaProfile?.modelIds).toEqual([
      "deepseek/deepseek-r1",
      "google/gemini-2.0-flash",
      "anthropic/claude-3.7-sonnet",
    ]);
    expect(mariaProfile?.interests).toBeDefined();
    expect(mariaProfile?.interests?.length).toBeGreaterThan(0);
    expect(mariaProfile?.interests).not.toEqual(alexProfile?.interests);

    // 3. Sign out and sign in back as Alex
    await client.auth.signOut();
    const { data: authA2 } = await client.auth.signInWithPassword({
      email: "alex@vibehub.dev",
      password: "password123",
    });
    const alexProfile2 = await repo.getProfile(authA2.user?.id);
    expect(alexProfile2).not.toBeNull();
    expect(alexProfile2?.displayName).toBe("Алексей Смирнов");
    expect(alexProfile2?.username).toBe("alex_dev");
    expect(alexProfile2?.avatarUrl).toBe(alexProfile?.avatarUrl);
    expect(alexProfile2?.modelIds).toEqual(alexProfile?.modelIds);
    expect(alexProfile2?.interests).toEqual(alexProfile?.interests);
  });
});
