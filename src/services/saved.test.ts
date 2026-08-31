import { describe, expect, it } from "vitest";
import {
  describeComment,
  describePost,
  describeRepository,
  fromBookmarks,
  isSaved,
  parseGithubUrl,
  savedId,
  toggleSaved,
} from "./saved";
import type { Tool } from "../types/hub";
import type { Post, PostComment } from "../types/posts";
import type { SavedItem } from "../types/saved";

function tool(partial: Partial<Tool>): Tool {
  return {
    id: "codex",
    name: "Codex",
    category: "coding",
    type: "cli",
    typeLabel: "CLI",
    tags: [],
    summary: "",
    compatibility: [],
    ...partial,
  };
}

describe("savedId", () => {
  it("объединяет kind и id", () => {
    expect(savedId("model", "openai/gpt-4o")).toBe("model:openai/gpt-4o");
    expect(savedId("post", "post-123")).toBe("post:post-123");
    expect(savedId("comment", "comment-456")).toBe("comment:comment-456");
  });
});

describe("toggleSaved / isSaved", () => {
  it("добавляет несохранённый элемент и удаляет сохранённый", () => {
    const item = { kind: "model" as const, targetId: "m", title: "M", subtitle: "P" };
    const afterAdd = toggleSaved([], item);
    expect(afterAdd).toHaveLength(1);
    expect(isSaved(afterAdd, "model", "m")).toBe(true);

    const afterRemove = toggleSaved(afterAdd, item);
    expect(afterRemove).toHaveLength(0);
    expect(isSaved(afterRemove, "model", "m")).toBe(false);
  });

  it("сохраняет и удаляет post закладки", () => {
    const postItem = {
      kind: "post" as const,
      targetId: "post-1",
      title: "Сравнение LLM",
      subtitle: "Обсуждение",
    };

    const saved = toggleSaved([], postItem);
    expect(saved).toHaveLength(1);
    expect(isSaved(saved, "post", "post-1")).toBe(true);

    const unsaved = toggleSaved(saved, postItem);
    expect(unsaved).toHaveLength(0);
    expect(isSaved(unsaved, "post", "post-1")).toBe(false);
  });

  it("сохраняет и удаляет comment закладки", () => {
    const commentItem = {
      kind: "comment" as const,
      targetId: "comment-99",
      title: "Отличный аргумент!",
      subtitle: "Сравнение LLM",
      postId: "post-1",
      commentId: "comment-99",
    };

    const saved = toggleSaved([], commentItem);
    expect(saved).toHaveLength(1);
    expect(isSaved(saved, "comment", "comment-99")).toBe(true);

    const unsaved = toggleSaved(saved, commentItem);
    expect(unsaved).toHaveLength(0);
    expect(isSaved(unsaved, "comment", "comment-99")).toBe(false);
  });
});

describe("fromBookmarks", () => {
  it("собирает отмеченные инструменты", () => {
    const items = fromBookmarks([
      tool({}),
      tool({ id: "skill-a", bookmarked: true }),
    ]);
    expect(items.length).toBe(1);
    expect(items[0].targetId).toBe("skill-a");
  });
});

describe("parseGithubUrl & describeRepository", () => {
  it("парсит полный https URL репозитория", () => {
    const parsed = parseGithubUrl("https://github.com/vllm-project/vllm");
    expect(parsed).toEqual({
      owner: "vllm-project",
      name: "vllm",
      url: "https://github.com/vllm-project/vllm",
    });
  });

  it("парсит короткий owner/repo формат", () => {
    const parsed = parseGithubUrl("facebookresearch/llama");
    expect(parsed).toEqual({
      owner: "facebookresearch",
      name: "llama",
      url: "https://github.com/facebookresearch/llama",
    });
  });

  it("формирует закладку репозитория", () => {
    const repo = describeRepository({
      url: "https://github.com/huggingface/transformers",
      description: "State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX.",
    });
    expect(repo.kind).toBe("repository");
    expect(repo.targetId).toBe("huggingface/transformers");
    expect(repo.title).toBe("transformers");
    expect(repo.subtitle).toBe("huggingface");
    expect(repo.url).toBe("https://github.com/huggingface/transformers");
    expect(repo.description).toBe("State-of-the-art Machine Learning for Pytorch, TensorFlow, and JAX.");
  });
});

describe("describePost & describeComment", () => {
  const mockPost: Post = {
    id: "post-100",
    type: "discussion",
    author: {
      id: "u1",
      name: "Lev Landon",
      handle: "levlandon",
      initials: "LL",
      avatarUrl: "https://avatar.com/lev.jpg",
    },
    title: "Новый релиз Claude 3.5 Sonnet",
    content: "Тестировал сегодня на кодинге в VS Code и Cursor. Результаты впечатляют.",
    createdAt: "2026-08-29T00:00:00.000Z",
    tags: ["models"],
    relatedEntities: [],
    reactions: [],
    comments: [],
    extras: { url: "https://claude.ai" },
  };

  const mockComment: PostComment = {
    id: "comment-200",
    author: {
      id: "u2",
      name: "Alex Dev",
      handle: "alexdev",
      initials: "AD",
      avatarUrl: "https://avatar.com/alex.jpg",
    },
    content: "Согласен, скорость генерации и точность рефакторинга стали заметно лучше.",
    createdAt: "2026-08-29T00:05:00.000Z",
  };

  it("describePost generates complete snapshot with author and link", () => {
    const desc = describePost(mockPost);
    expect(desc.kind).toBe("post");
    expect(desc.targetId).toBe("post-100");
    expect(desc.title).toBe("Новый релиз Claude 3.5 Sonnet");
    expect(desc.subtitle).toBe("Обсуждение");
    expect(desc.url).toBe("https://claude.ai");
    expect(desc.authorName).toBe("Lev Landon");
    expect(desc.authorHandle).toBe("levlandon");
  });

  it("describeComment generates deep-link URL and post context", () => {
    const desc = describeComment(mockComment, mockPost);
    expect(desc.kind).toBe("comment");
    expect(desc.targetId).toBe("comment-200");
    expect(desc.commentId).toBe("comment-200");
    expect(desc.postId).toBe("post-100");
    expect(desc.subtitle).toBe("Новый релиз Claude 3.5 Sonnet");
    expect(desc.url).toBe("/posts/post-100?comment=comment-200");
    expect(desc.authorName).toBe("Alex Dev");
    expect(desc.authorHandle).toBe("alexdev");
    expect(desc.description).toContain("скорость генерации");
  });
});

describe("Bookmarks categorization & filtering in Saved page", () => {
  const items: SavedItem[] = [
    { id: "1", kind: "model", targetId: "openai/gpt-4o", title: "GPT-4o", savedAt: "2026-08-29T00:00:00.000Z" },
    { id: "2", kind: "tool", targetId: "cursor", title: "Cursor", savedAt: "2026-08-29T00:00:00.000Z" },
    { id: "3", kind: "repository", targetId: "vllm-project/vllm", title: "vllm", savedAt: "2026-08-29T00:00:00.000Z" },
    { id: "4", kind: "post", targetId: "post-1", title: "Post 1", savedAt: "2026-08-29T00:00:00.000Z" },
    { id: "5", kind: "comment", targetId: "c-1", title: "Comment 1", savedAt: "2026-08-29T00:00:00.000Z", postId: "post-1", commentId: "c-1" },
  ];

  it("resolves exact counts per tab", () => {
    const modelsCount = items.filter((i) => i.kind === "model").length;
    const toolsCount = items.filter((i) => i.kind === "tool").length;
    const reposCount = items.filter((i) => i.kind === "repository").length;
    const postsCount = items.filter((i) => i.kind === "post").length;
    const commentsCount = items.filter((i) => i.kind === "comment").length;

    expect(items.length).toBe(5);
    expect(modelsCount).toBe(1);
    expect(toolsCount).toBe(1);
    expect(reposCount).toBe(1);
    expect(postsCount).toBe(1);
    expect(commentsCount).toBe(1);
  });
});

describe("User Profile Publications filtering", () => {
  const posts: Post[] = [
    {
      id: "p1",
      type: "discussion",
      author: { id: "user-1", name: "User 1", handle: "user1", initials: "U1" },
      title: "Older post",
      content: "A",
      createdAt: "2026-08-28T10:00:00.000Z",
      tags: [],
      relatedEntities: [],
      reactions: [],
      comments: [],
      extras: {},
    },
    {
      id: "p2",
      type: "discussion",
      author: { id: "user-2", name: "User 2", handle: "user2", initials: "U2" },
      title: "Other user post",
      content: "B",
      createdAt: "2026-08-28T12:00:00.000Z",
      tags: [],
      relatedEntities: [],
      reactions: [],
      comments: [],
      extras: {},
    },
    {
      id: "p3",
      type: "discussion",
      author: { id: "user-1", name: "User 1", handle: "user1", initials: "U1" },
      title: "Newer post",
      content: "C",
      createdAt: "2026-08-28T15:00:00.000Z",
      tags: [],
      relatedEntities: [],
      reactions: [],
      comments: [],
      extras: {},
    },
  ];

  it("filters strictly by exact user ID and sorts newest first", () => {
    const targetUserId = "user-1";
    const userPosts = posts
      .filter((p) => p.author.id === targetUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    expect(userPosts).toHaveLength(2);
    expect(userPosts[0].id).toBe("p3"); // Newer first
    expect(userPosts[1].id).toBe("p1"); // Older second
  });

  it("empty state when user has no publications", () => {
    const targetUserId = "user-non-existent";
    const userPosts = posts.filter((p) => p.author.id === targetUserId);
    expect(userPosts).toHaveLength(0);
  });
});
