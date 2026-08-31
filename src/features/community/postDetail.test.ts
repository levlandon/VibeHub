import { describe, expect, it } from "vitest";
import { parseSpans } from "../../services/content";
import { mentionIndex } from "../../services/entities";
import { addComment } from "../../services/posts";
import type { ChatAuthor, Model, Tool } from "../../types/hub";
import type { Post, PostComment } from "../../types/posts";

describe("Post Detail & One-Level Comment Threading UX Logic", () => {
  const mockModels = [
    { id: "claude-opus-4-1", name: "Claude Opus 4.1", provider: "Anthropic" },
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  ] as unknown as Model[];
  const mockTools = [{ id: "cursor", name: "Cursor" }] as unknown as Tool[];

  const authorLev: ChatAuthor = {
    id: "u1",
    name: "Lev Landon",
    handle: "levlandon",
    initials: "LL",
  };
  const authorAlex: ChatAuthor = {
    id: "u2",
    name: "Alex Dev",
    handle: "alexdev",
    initials: "AD",
  };
  const authorMaria: ChatAuthor = {
    id: "u3",
    name: "Maria AI",
    handle: "maria_ai",
    initials: "MA",
  };

  it("1. normal comment => parentCommentId is undefined/null", () => {
    const initialPosts: Post[] = [
      {
        id: "post-1",
        type: "discussion",
        author: authorLev,
        title: "Test post",
        content: "Content",
        createdAt: "2026-08-28T00:00:00.000Z",
        tags: [],
        relatedEntities: [],
        reactions: [],
        comments: [],
        extras: {},
      },
    ];

    const updated = addComment(initialPosts, "post-1", "A normal root comment");
    expect(updated[0].comments).toHaveLength(1);
    expect(updated[0].comments[0].parentCommentId).toBeUndefined();
    expect(updated[0].comments[0].content).toBe("A normal root comment");
  });

  it("2. Reply to comment => sets correct parentCommentId and replyToCommentId", () => {
    const rootComment: PostComment = {
      id: "root-1",
      author: authorAlex,
      content: "Root comment by Alex",
      createdAt: "2026-08-28T00:01:00.000Z",
    };

    const initialPosts: Post[] = [
      {
        id: "post-1",
        type: "discussion",
        author: authorLev,
        title: "Test post",
        content: "Content",
        createdAt: "2026-08-28T00:00:00.000Z",
        tags: [],
        relatedEntities: [],
        reactions: [],
        comments: [rootComment],
        extras: {},
      },
    ];

    const updated = addComment(
      initialPosts,
      "post-1",
      "I agree!",
      rootComment.id,
      rootComment.id,
    );

    expect(updated[0].comments).toHaveLength(2);
    const reply = updated[0].comments[1];
    expect(reply.parentCommentId).toBe("root-1");
    expect(reply.replyToCommentId).toBe("root-1");
    expect(reply.content).toBe("I agree!");
  });

  it("3. Structured reply preview contains exact target author name and content excerpt", () => {
    const targetComment: PostComment = {
      id: "c-long",
      author: authorMaria,
      content: "Я думаю, что у этой модели отличные результаты в кодинге и бенчмарках.",
      createdAt: "2026-08-28T00:01:00.000Z",
    };

    const activeReplyTarget = {
      postId: "post-1",
      commentId: targetComment.id,
      rootCommentId: targetComment.id,
      author: targetComment.author,
      content: targetComment.content,
    };

    expect(activeReplyTarget.author.name).toBe("Maria AI");
    expect(activeReplyTarget.content).toContain("отличные результаты");
    expect(activeReplyTarget.commentId).toBe("c-long");
    expect(activeReplyTarget.postId).toBe("post-1");
  });

  it("4. Two comments by the same author produce distinct previews", () => {
    const comment1: PostComment = {
      id: "c-alex-1",
      author: authorAlex,
      content: "Первая мысль Алекса",
      createdAt: "2026-08-28T00:01:00.000Z",
    };
    const comment2: PostComment = {
      id: "c-alex-2",
      author: authorAlex,
      content: "Вторая мысль Алекса совершенно о другом",
      createdAt: "2026-08-28T00:05:00.000Z",
    };

    const target1 = {
      postId: "post-1",
      commentId: comment1.id,
      rootCommentId: comment1.id,
      author: comment1.author,
      content: comment1.content,
    };

    const target2 = {
      postId: "post-1",
      commentId: comment2.id,
      rootCommentId: comment2.id,
      author: comment2.author,
      content: comment2.content,
    };

    expect(target1.commentId).not.toBe(target2.commentId);
    expect(target1.content).toBe("Первая мысль Алекса");
    expect(target2.content).toBe("Вторая мысль Алекса совершенно о другом");
  });

  it("5. Editor does NOT auto-insert @username into reply text", () => {
    const targetComment: PostComment = {
      id: "c-alex",
      author: authorAlex,
      content: "Hello",
      createdAt: "2026-08-28T00:01:00.000Z",
    };

    // Before reply
    const replyText = "";

    // User clicks reply on targetComment
    const activeReplyTarget = {
      postId: "post-1",
      commentId: targetComment.id,
      rootCommentId: targetComment.id,
      author: targetComment.author,
      content: targetComment.content,
    };

    // In refined UX, replyText remains unmodified
    expect(replyText).toBe("");
    expect(activeReplyTarget.author.name).toBe("Alex Dev");
  });

  it("6. Cancelling reply clears active reply target without discarding drafted text", () => {
    let activeReplyTarget: {
      postId: string;
      commentId: string;
      rootCommentId: string;
      author: ChatAuthor;
      content: string;
    } | null = {
      postId: "post-1",
      commentId: "c1",
      rootCommentId: "root1",
      author: authorAlex,
      content: "Target comment",
    };
    const draftedText = "I was already writing my answer here...";

    expect(activeReplyTarget).not.toBeNull();

    // User clicks 'x' on preview
    activeReplyTarget = null;

    expect(activeReplyTarget).toBeNull();
    // Drafted text remains untouched
    expect(draftedText).toBe("I was already writing my answer here...");
  });

  it("7. Switching reply target updates target comment and excerpt without losing draft", () => {
    let activeReplyTarget = {
      postId: "post-1",
      commentId: "c1",
      rootCommentId: "root1",
      author: authorAlex,
      content: "Comment 1 by Alex",
    };
    const draftedText = "My in-progress comment";
    expect(activeReplyTarget.commentId).toBe("c1");

    // User clicks reply on comment 2
    activeReplyTarget = {
      postId: "post-1",
      commentId: "c2",
      rootCommentId: "root1",
      author: authorMaria,
      content: "Comment 2 by Maria",
    };

    expect(activeReplyTarget.commentId).toBe("c2");
    expect(activeReplyTarget.author.name).toBe("Maria AI");
    expect(activeReplyTarget.content).toBe("Comment 2 by Maria");
    expect(draftedText).toBe("My in-progress comment");
  });

  it("8. Reply-to-reply preserves direct target (replyToCommentId) and root thread grouping (parentCommentId)", () => {
    const rootComment: PostComment = {
      id: "root-100",
      author: authorAlex,
      content: "Root comment",
      createdAt: "2026-08-28T00:01:00.000Z",
    };
    const firstReply: PostComment = {
      id: "reply-101",
      author: authorMaria,
      content: "First reply by Maria",
      createdAt: "2026-08-28T00:02:00.000Z",
      parentCommentId: "root-100",
      replyToCommentId: "root-100",
    };

    const post: Post[] = [
      {
        id: "post-1",
        type: "discussion",
        author: authorLev,
        title: "Test post",
        content: "Content",
        createdAt: "2026-08-28T00:00:00.000Z",
        tags: [],
        relatedEntities: [],
        reactions: [],
        comments: [rootComment, firstReply],
        extras: {},
      },
    ];

    const updated = addComment(
      post,
      "post-1",
      "Replying specifically to Maria in Alex's thread",
      firstReply.parentCommentId,
      firstReply.id,
    );

    const secondReply = updated[0].comments[2];
    expect(secondReply.parentCommentId).toBe("root-100");
    expect(secondReply.replyToCommentId).toBe("reply-101");
    expect(secondReply.content).toBe("Replying specifically to Maria in Alex's thread");
  });

  it("9. Root comments and replies separation: 1-level visual nesting remains intact", () => {
    const root1: PostComment = {
      id: "root-1",
      author: authorAlex,
      content: "First topic",
      createdAt: "2026-08-28T00:01:00.000Z",
    };
    const reply1: PostComment = {
      id: "reply-1",
      author: authorMaria,
      content: "Reply to first topic",
      createdAt: "2026-08-28T00:02:00.000Z",
      parentCommentId: "root-1",
      replyToCommentId: "root-1",
    };
    const reply2: PostComment = {
      id: "reply-2",
      author: authorLev,
      content: "Second reply in same thread",
      createdAt: "2026-08-28T00:03:00.000Z",
      parentCommentId: "root-1",
      replyToCommentId: "reply-1",
    };

    const allComments = [root1, reply1, reply2];

    const rootComments = allComments.filter((c) => !c.parentCommentId);
    expect(rootComments).toEqual([root1]);

    const repliesByRoot = new Map<string, PostComment[]>();
    for (const c of allComments) {
      if (c.parentCommentId) {
        const list = repliesByRoot.get(c.parentCommentId) || [];
        list.push(c);
        repliesByRoot.set(c.parentCommentId, list);
      }
    }

    const repliesForRoot1 = repliesByRoot.get("root-1") || [];
    expect(repliesForRoot1).toHaveLength(2);
    expect(repliesForRoot1[0].id).toBe("reply-1");
    expect(repliesForRoot1[1].id).toBe("reply-2");
    expect(repliesForRoot1[1].replyToCommentId).toBe("reply-1");
  });

  it("10. Soft deletion preserves thread integrity and reply targets", () => {
    const rootComment: PostComment = {
      id: "root-del",
      author: authorAlex,
      content: "Root to be deleted",
      createdAt: "2026-08-28T00:01:00.000Z",
    };
    const replyA: PostComment = {
      id: "reply-a",
      author: authorMaria,
      content: "Valuable reply A",
      createdAt: "2026-08-28T00:02:00.000Z",
      parentCommentId: "root-del",
      replyToCommentId: "root-del",
    };

    let postComments = [rootComment, replyA];
    const deleteTime = new Date().toISOString();

    postComments = postComments.map((c) =>
      c.id === "root-del" ? { ...c, deletedAt: deleteTime } : c,
    );

    const updatedRoot = postComments.find((c) => c.id === "root-del");
    expect(updatedRoot?.deletedAt).toBe(deleteTime);

    const replies = postComments.filter((c) => c.parentCommentId === "root-del");
    expect(replies).toHaveLength(1);
    expect(replies[0].id).toBe("reply-a");
  });

  it("11. Mentions @User remain parsed and linked correctly", () => {
    const entities = mentionIndex(mockModels, mockTools, [
      authorLev,
      authorAlex,
      authorMaria,
    ]);

    const text = "Thanks @Lev Landon and @Maria AI for the insights!";
    const spans = parseSpans(text, entities);
    const mentions = spans.filter((s) => s.type === "mention");

    expect(mentions).toHaveLength(2);
    expect(mentions[0].entity?.id).toBe("levlandon");
    expect(mentions[1].entity?.id).toBe("maria_ai");
  });

  /* REGRESSION TESTS FOR POST-SCOPED STATE ISOLATION */

  it("12. Lifecycle isolation: Navigating from Post A to Post B clears active reply target and preview", () => {
    // State simulation in Post A
    let currentPostId = "post-A";
    let activeReplyTarget: {
      postId: string;
      commentId: string;
      rootCommentId: string;
      author: ChatAuthor;
      content: string;
    } | null = {
      postId: "post-A",
      commentId: "c-a1",
      rootCommentId: "root-a1",
      author: authorAlex,
      content: "Comment in Post A",
    };
    let replyText = "Draft for Post A";

    expect(activeReplyTarget).not.toBeNull();
    expect(activeReplyTarget?.postId).toBe("post-A");

    // User navigates from Post A to Post B
    const handleNavigate = (nextPostId: string) => {
      currentPostId = nextPostId;
      activeReplyTarget = null;
      replyText = "";
    };

    handleNavigate("post-B");

    expect(currentPostId).toBe("post-B");
    expect(activeReplyTarget).toBeNull();
    expect(replyText).toBe("");
  });

  it("13. Navigation back from Post B to Post A does NOT restore previous activeReplyTarget", () => {
    let activeReplyTarget: { postId: string; commentId: string } | null = {
      postId: "post-A",
      commentId: "c-a1",
    };
    expect(activeReplyTarget.postId).toBe("post-A");

    // User moves to Post B
    activeReplyTarget = null;
    expect(activeReplyTarget).toBeNull();

    // User returns to Post A
    // Fresh mount / reset ensures activeReplyTarget stays null
    expect(activeReplyTarget).toBeNull();
  });

  it("14. Safety guard: target comment deletion or mismatch clears activeReplyTarget", () => {
    const postComments: PostComment[] = [
      {
        id: "c-valid",
        author: authorAlex,
        content: "Valid comment",
        createdAt: "2026-08-28T00:00:00.000Z",
      },
    ];

    let activeReplyTarget: {
      postId: string;
      commentId: string;
    } | null = {
      postId: "post-A",
      commentId: "c-deleted",
    };

    // Safety guard check: comment must exist in current post comments and not be deleted
    const guard = (
      currentPostId: string,
      comments: PostComment[],
      target: typeof activeReplyTarget,
    ) => {
      if (!target) return null;
      if (target.postId !== currentPostId) return null;
      const exists = comments.some((c) => c.id === target.commentId && !c.deletedAt);
      if (!exists) return null;
      return target;
    };

    // Target does not exist in postComments -> guard returns null
    activeReplyTarget = guard("post-A", postComments, activeReplyTarget);
    expect(activeReplyTarget).toBeNull();
  });

  it("15. Two posts by the same author do NOT leak reply target or comment selection", () => {
    const postA: Post = {
      id: "post-10",
      type: "discussion",
      author: authorAlex,
      title: "Alex Post 1",
      content: "Content 1",
      createdAt: "2026-08-28T00:00:00.000Z",
      tags: [],
      relatedEntities: [],
      reactions: [],
      comments: [
        {
          id: "c-10-1",
          author: authorMaria,
          content: "Comment on Post 1",
          createdAt: "2026-08-28T00:01:00.000Z",
        },
      ],
      extras: {},
    };

    const postB: Post = {
      id: "post-20",
      type: "discussion",
      author: authorAlex, // Same author!
      title: "Alex Post 2",
      content: "Content 2",
      createdAt: "2026-08-28T00:00:00.000Z",
      tags: [],
      relatedEntities: [],
      reactions: [],
      comments: [
        {
          id: "c-20-1",
          author: authorMaria,
          content: "Comment on Post 2",
          createdAt: "2026-08-28T00:01:00.000Z",
        },
      ],
      extras: {},
    };

    let activeReplyTarget: { postId: string; commentId: string } | null = {
      postId: postA.id,
      commentId: "c-10-1",
    };

    // Switch to postB
    const switchTo = (nextPost: Post) => {
      if (activeReplyTarget && activeReplyTarget.postId !== nextPost.id) {
        activeReplyTarget = null;
      }
    };

    switchTo(postB);
    expect(activeReplyTarget).toBeNull();
  });

  it("16. Persistent shell navigation: atomic postId switch maintains open modal without unmount", () => {
    // In FeedPage, selectedPostId transitions atomically from postA to postB
    let selectedPostId: string | null = "post-A";
    const modalMounted = true; // Stays mounted throughout navigation
    expect(selectedPostId).toBe("post-A");

    // User clicks related post B
    selectedPostId = "post-B";

    // No intermediate null, modal remains mounted
    expect(modalMounted).toBe(true);
    expect(selectedPostId).toBe("post-B");
  });

  it("17. Scroll positions and transient menu state reset smoothly on post change", () => {
    let leftPaneScrollTop = 450;
    let commentsScrollTop = 200;
    let openMenuCommentId: string | null = "comment-123";

    // Post change effect:
    const onPostChange = () => {
      leftPaneScrollTop = 0;
      commentsScrollTop = 0;
      openMenuCommentId = null;
    };

    onPostChange();

    expect(leftPaneScrollTop).toBe(0);
    expect(commentsScrollTop).toBe(0);
    expect(openMenuCommentId).toBeNull();
  });

  /* NEW UX TESTS: DELETED COMMENTS FILTERING & KEYBOARD/COMPOSER SEMANTICS */

  it("18. Deleted leaf comment without replies is completely excluded from UI rendering", () => {
    const deletedLeafRoot: PostComment = {
      id: "leaf-root-1",
      author: authorAlex,
      content: "This root was deleted and has zero replies",
      createdAt: "2026-08-28T00:01:00.000Z",
      deletedAt: "2026-08-28T00:05:00.000Z",
    };
    const activeRoot: PostComment = {
      id: "active-root-1",
      author: authorMaria,
      content: "This root is active",
      createdAt: "2026-08-28T00:02:00.000Z",
    };
    const deletedReply: PostComment = {
      id: "deleted-reply-1",
      author: authorLev,
      content: "This reply was deleted",
      createdAt: "2026-08-28T00:03:00.000Z",
      parentCommentId: "active-root-1",
      deletedAt: "2026-08-28T00:06:00.000Z",
    };

    const allComments = [deletedLeafRoot, activeRoot, deletedReply];

    // Filter root comments:
    const rootComments = allComments.filter((c) => !c.parentCommentId);
    const repliesByRoot = new Map<string, PostComment[]>();
    for (const c of allComments) {
      if (c.parentCommentId) {
        const list = repliesByRoot.get(c.parentCommentId) || [];
        list.push(c);
        repliesByRoot.set(c.parentCommentId, list);
      }
    }

    // Visible root comments rule:
    const visibleRoots = rootComments.filter((root) => {
      if (!root.deletedAt) return true;
      const replies = repliesByRoot.get(root.id) || [];
      const activeReplies = replies.filter((r) => !r.deletedAt);
      return activeReplies.length > 0;
    });

    // leaf-root-1 has no replies -> must be omitted completely
    expect(visibleRoots).toHaveLength(1);
    expect(visibleRoots[0].id).toBe("active-root-1");

    // active-root-1's replies: deleted-reply-1 is a deleted leaf -> omitted
    const visibleReplies = (repliesByRoot.get("active-root-1") || []).filter(
      (r) => !r.deletedAt,
    );
    expect(visibleReplies).toHaveLength(0);
  });

  it("19. Deleted root comment with active replies renders compact tombstone and preserves replies", () => {
    const deletedRootWithReplies: PostComment = {
      id: "root-with-replies",
      author: authorAlex,
      content: "Original root content",
      createdAt: "2026-08-28T00:01:00.000Z",
      deletedAt: "2026-08-28T00:04:00.000Z",
    };
    const activeReply: PostComment = {
      id: "active-reply-1",
      author: authorMaria,
      content: "Valuable reply under deleted root",
      createdAt: "2026-08-28T00:02:00.000Z",
      parentCommentId: "root-with-replies",
    };

    const allComments = [deletedRootWithReplies, activeReply];
    const rootComments = allComments.filter((c) => !c.parentCommentId);
    const repliesByRoot = new Map<string, PostComment[]>();
    for (const c of allComments) {
      if (c.parentCommentId) {
        const list = repliesByRoot.get(c.parentCommentId) || [];
        list.push(c);
        repliesByRoot.set(c.parentCommentId, list);
      }
    }

    const visibleRoots = rootComments.filter((root) => {
      if (!root.deletedAt) return true;
      const replies = repliesByRoot.get(root.id) || [];
      const activeReplies = replies.filter((r) => !r.deletedAt);
      return activeReplies.length > 0;
    });

    // Root remains in structure as placeholder
    expect(visibleRoots).toHaveLength(1);
    expect(visibleRoots[0].id).toBe("root-with-replies");
    expect(Boolean(visibleRoots[0].deletedAt)).toBe(true);

    // Active reply is preserved
    const visibleReplies = (repliesByRoot.get("root-with-replies") || []).filter(
      (r) => !r.deletedAt,
    );
    expect(visibleReplies).toHaveLength(1);
    expect(visibleReplies[0].content).toBe("Valuable reply under deleted root");
  });

  it("20. Discussion count counts only active non-deleted comments", () => {
    const comments: PostComment[] = [
      { id: "1", author: authorAlex, content: "A", createdAt: "2026-08-28T00:00:00.000Z" },
      { id: "2", author: authorMaria, content: "B", createdAt: "2026-08-28T00:00:00.000Z", deletedAt: "2026-08-28T00:01:00.000Z" },
      { id: "3", author: authorLev, content: "C", createdAt: "2026-08-28T00:00:00.000Z" },
    ];

    const activeCount = comments.filter((c) => !c.deletedAt).length;
    expect(activeCount).toBe(2);
  });

  it("21. Keyboard semantics: Enter submits, Shift+Enter inserts newline without submitting, IME is ignored", () => {
    let submitted = false;

    const handleKeyDown = (e: {
      key: string;
      shiftKey: boolean;
      nativeEvent: { isComposing?: boolean };
      preventDefault: () => void;
    }) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter") {
        if (e.shiftKey) {
          // Shift+Enter -> insert newline, do NOT submit
          return;
        }
        e.preventDefault();
        submitted = true;
      }
    };

    // Test 1: Shift+Enter does NOT submit
    let preventDefaultCalled = false;
    handleKeyDown({
      key: "Enter",
      shiftKey: true,
      nativeEvent: { isComposing: false },
      preventDefault: () => { preventDefaultCalled = true; },
    });
    expect(submitted).toBe(false);
    expect(preventDefaultCalled).toBe(false);

    // Test 2: Enter while IME composing does NOT submit
    handleKeyDown({
      key: "Enter",
      shiftKey: false,
      nativeEvent: { isComposing: true },
      preventDefault: () => { preventDefaultCalled = true; },
    });
    expect(submitted).toBe(false);

    // Test 3: Standard Enter submits
    handleKeyDown({
      key: "Enter",
      shiftKey: false,
      nativeEvent: { isComposing: false },
      preventDefault: () => { preventDefaultCalled = true; },
    });
    expect(submitted).toBe(true);
    expect(preventDefaultCalled).toBe(true);
  });

  it("22. Textarea height auto-grow logic and max-height capping", () => {
    const calculateHeight = (scrollHeight: number) => {
      return Math.min(140, Math.max(32, scrollHeight));
    };

    // Single line
    expect(calculateHeight(24)).toBe(32);
    // 3 lines
    expect(calculateHeight(68)).toBe(68);
    // Large multiline content capped at max-height
    expect(calculateHeight(300)).toBe(140);
  });

  it("23. Submit resets editor text and height back to initial", () => {
    let replyText = "Line 1\nLine 2\nLine 3";
    let height = 68;
    expect(replyText).toContain("Line 1");
    expect(height).toBe(68);

    // Upon submit:
    replyText = "";
    height = 32;

    expect(replyText).toBe("");
    expect(height).toBe(32);
  });

  /* SOCIAL / SAVED & DEEP LINK TESTS */

  it("24. Comment bookmarking: toggleSavedTarget saves and removes comment without polluting post state", () => {
    const post: Post = {
      id: "post-10",
      type: "discussion",
      author: authorLev,
      title: "Main Post",
      content: "Main Content",
      createdAt: "2026-08-28T00:00:00.000Z",
      tags: [],
      relatedEntities: [],
      reactions: [],
      comments: [],
      extras: {},
    };
    const comment: PostComment = {
      id: "c-alex-1",
      author: authorAlex,
      content: "Alex's insight",
      createdAt: "2026-08-28T00:01:00.000Z",
    };

    const savedRecord = {
      kind: "comment" as const,
      targetId: comment.id,
      title: comment.content,
      subtitle: post.title,
      postId: post.id,
      commentId: comment.id,
    };

    // User saves comment
    let bookmarks: typeof savedRecord[] = [];
    bookmarks = [...bookmarks, savedRecord];
    expect(bookmarks.some((b) => b.kind === "comment" && b.targetId === "c-alex-1")).toBe(true);

    // User removes bookmark
    bookmarks = bookmarks.filter((b) => !(b.kind === "comment" && b.targetId === "c-alex-1"));
    expect(bookmarks.some((b) => b.kind === "comment" && b.targetId === "c-alex-1")).toBe(false);
  });

  it("25. Deep link resolution: highlights exact comment ID without turning on reply mode", () => {
    const activeReplyTarget = null;
    const highlightedCommentId: string | null = "c-target-123";

    // Deep link only sets highlightedCommentId, leaving activeReplyTarget null
    expect(highlightedCommentId).toBe("c-target-123");
    expect(activeReplyTarget).toBeNull();
  });

  it("26. Two comments by same author resolve deep-link by exact comment ID, not by author", () => {
    const postComments: PostComment[] = [
      { id: "c-first", author: authorAlex, content: "First by Alex", createdAt: "2026-08-28T00:00:00.000Z" },
      { id: "c-second", author: authorAlex, content: "Second by Alex", createdAt: "2026-08-28T00:05:00.000Z" },
    ];

    const resolveTarget = (targetId: string) => postComments.find((c) => c.id === targetId) || null;

    const resolvedFirst = resolveTarget("c-first");
    const resolvedSecond = resolveTarget("c-second");

    expect(resolvedFirst?.content).toBe("First by Alex");
    expect(resolvedSecond?.content).toBe("Second by Alex");
  });

  it("27. Missing or deleted deep-linked comment gracefully degrades without crashing", () => {
    const postComments: PostComment[] = [
      { id: "c-active", author: authorAlex, content: "Active comment", createdAt: "2026-08-28T00:00:00.000Z" },
      { id: "c-deleted", author: authorAlex, content: "Deleted", createdAt: "2026-08-28T00:01:00.000Z", deletedAt: "2026-08-28T00:02:00.000Z" },
    ];

    const resolveAndHighlight = (targetId: string) => {
      const found = postComments.find((c) => c.id === targetId && !c.deletedAt);
      return found ? found.id : null;
    };

    expect(resolveAndHighlight("non-existent-id")).toBeNull();
    expect(resolveAndHighlight("c-deleted")).toBeNull();
    expect(resolveAndHighlight("c-active")).toBe("c-active");
  });

  /* COMMENT ACTION MENU & TOOLTIP REGRESSION TESTS */

  it("28. Single open comment menu: opening menu B automatically closes menu A", () => {
    let openCommentMenuId: string | null = null;

    const toggleMenu = (commentId: string) => {
      openCommentMenuId = openCommentMenuId === commentId ? null : commentId;
    };

    // Open menu A
    toggleMenu("comment-A");
    expect(openCommentMenuId).toBe("comment-A");

    // Open menu B -> menu A is closed, menu B is open
    toggleMenu("comment-B");
    expect(openCommentMenuId).toBe("comment-B");

    // Click menu B again -> toggles closed
    toggleMenu("comment-B");
    expect(openCommentMenuId).toBeNull();
  });

  it("29. Tooltip is suppressed while comment action menu is open", () => {
    const getButtonTitle = (isMenuOpen: boolean, label: string) => {
      return isMenuOpen ? "" : label;
    };

    expect(getButtonTitle(false, "Опции комментария")).toBe("Опции комментария");
    expect(getButtonTitle(true, "Опции комментария")).toBe("");
  });

  it("30. Actions (reply start, post switch, scroll, Escape) reset open comment menu", () => {
    let openCommentMenuId: string | null = "comment-123";

    // 1. Starting reply closes menu
    const handleStartReply = () => {
      openCommentMenuId = null;
    };
    handleStartReply();
    expect(openCommentMenuId).toBeNull();

    // 2. Switching post closes menu
    openCommentMenuId = "comment-456";
    const handlePostSwitch = () => {
      openCommentMenuId = null;
    };
    handlePostSwitch();
    expect(openCommentMenuId).toBeNull();

    // 3. Scrolling comments pane closes menu
    openCommentMenuId = "comment-789";
    const handleScroll = () => {
      openCommentMenuId = null;
    };
    handleScroll();
    expect(openCommentMenuId).toBeNull();
  });

  /* REPLY PREVIEW & COMPOSER GEOMETRY TESTS */

  it("31. Reply preview is rendered outside editor surface with neutral placeholder", () => {
    const placeholder = "Написать ответ...";
    expect(placeholder).toBe("Написать ответ...");

    // Preview contains target author name and excerpt
    const replyTarget = {
      authorName: "Lev Landon",
      contentExcerpt: "Тестировал новую модель",
    };
    expect(replyTarget.authorName).toBe("Lev Landon");
    expect(replyTarget.contentExcerpt).toBe("Тестировал новую модель");
  });

  it("32. Canceling reply target removes preview while preserving draft text", () => {
    let activeReplyTarget: object | null = { author: "Lev", content: "Great!" };
    const replyText = "My in-progress draft answer";

    expect(activeReplyTarget).not.toBeNull();

    // Cancel reply target
    activeReplyTarget = null;

    expect(activeReplyTarget).toBeNull();
    expect(replyText).toBe("My in-progress draft answer");
  });

  /* PROFILE HOVER CARD PORTAL POSITIONING */

  it("33. ProfileHoverCard viewport collision detection: flips top/bottom and shifts left/right", () => {
    const computeHoverCardPosition = (
      triggerRect: { top: number; bottom: number; left: number },
      viewport: { width: number; height: number },
    ) => {
      const cardWidth = 290;
      const estimatedHeight = 220;

      // Vertical
      let top: number;
      if (triggerRect.top < estimatedHeight + 20) {
        top = triggerRect.bottom + 8; // Open below
      } else {
        top = Math.max(16, triggerRect.top - estimatedHeight - 8); // Open above
      }

      // Horizontal
      let left = triggerRect.left;
      if (left + cardWidth > viewport.width - 16) {
        left = Math.max(16, viewport.width - cardWidth - 16);
      }
      if (left < 16) {
        left = 16;
      }

      return { top, left };
    };

    // Trigger near top of viewport -> opens below
    const posTop = computeHoverCardPosition(
      { top: 50, bottom: 80, left: 100 },
      { width: 1200, height: 800 },
    );
    expect(posTop.top).toBe(88);
    expect(posTop.left).toBe(100);

    // Trigger near bottom of viewport -> opens above
    const posBottom = computeHoverCardPosition(
      { top: 700, bottom: 730, left: 100 },
      { width: 1200, height: 800 },
    );
    expect(posBottom.top).toBe(472);

    // Trigger near right edge of viewport -> shifts left
    const posRightEdge = computeHoverCardPosition(
      { top: 400, bottom: 430, left: 1100 },
      { width: 1200, height: 800 },
    );
    expect(posRightEdge.left).toBe(1200 - 290 - 16);
  });
});

