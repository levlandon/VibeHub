import { describe, expect, it } from "vitest";
import type { Post } from "../../types/posts";
import { computeRelatedPosts } from "./relatedPosts";

function createMockPost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    type: "discussion",
    category: "models",
    author: {
      id: "user-1",
      name: "Lev Landon",
      handle: "levlandon",
      initials: "LL",
    },
    title: "Тестирование Claude Opus 4.1",
    content: "Очень мощная модель для аналитики.",
    createdAt: new Date().toISOString(),
    tags: ["claude", "ai"],
    relatedEntities: [
      { kind: "model", id: "claude-opus-4-1", name: "Claude Opus 4.1" },
    ],
    reactions: [{ emoji: "🔥", count: 3 }],
    comments: [],
    extras: {},
    ...overrides,
  };
}

describe("computeRelatedPosts (Deterministic Ranking)", () => {
  it("исключает текущий пост из списка рекомендаций", () => {
    const current = createMockPost({ id: "current-post" });
    const all = [
      current,
      createMockPost({ id: "p2", category: "models" }),
      createMockPost({ id: "p3", category: "models" }),
    ];

    const related = computeRelatedPosts(current, all);
    expect(related.find((p) => p.id === "current-post")).toBeUndefined();
    expect(related).toHaveLength(2);
  });

  it("ранжирует пост с общей моделью/сущностью выше поста только с той же категорией", () => {
    const current = createMockPost({
      id: "current",
      category: "models",
      relatedEntities: [
        { kind: "model", id: "claude-opus-4-1", name: "Claude Opus 4.1" },
      ],
    });

    const postSharedEntity = createMockPost({
      id: "shared-entity",
      category: "tools", // Different category
      relatedEntities: [
        { kind: "model", id: "claude-opus-4-1", name: "Claude Opus 4.1" },
      ],
      title: "Промпты для Claude Opus 4.1",
    });

    const postSameCategoryOnly = createMockPost({
      id: "same-category",
      category: "models",
      relatedEntities: [
        { kind: "model", id: "gpt-4o", name: "GPT-4o" },
      ],
      title: "Новый релиз OpenAI",
    });

    const all = [postSameCategoryOnly, postSharedEntity];
    const related = computeRelatedPosts(current, all);

    expect(related[0].id).toBe("shared-entity");
    expect(related[1].id).toBe("same-category");
  });

  it("учитывает вовлеченность (реакции и комментарии) при равных сущностях", () => {
    const current = createMockPost({
      id: "current",
      category: "models",
    });

    const postLowEngagement = createMockPost({
      id: "low-eng",
      category: "models",
      reactions: [],
      comments: [],
    });

    const postHighEngagement = createMockPost({
      id: "high-eng",
      category: "models",
      reactions: [{ emoji: "🔥", count: 10 }],
      comments: [
        {
          id: "c1",
          author: { name: "A", handle: "a", initials: "A" },
          content: "Great",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const all = [postLowEngagement, postHighEngagement];
    const related = computeRelatedPosts(current, all);

    expect(related[0].id).toBe("high-eng");
  });

  it("ограничивает количество элементов переданным лимитом", () => {
    const current = createMockPost({ id: "current" });
    const all = Array.from({ length: 10 }, (_, i) =>
      createMockPost({ id: `post-${i}`, category: "models" }),
    );

    const related = computeRelatedPosts(current, all, 2);
    expect(related).toHaveLength(2);
  });

  it("не возвращает совершенно нерелевантные посты (без общих сущностей и без совпадения категории)", () => {
    const current = createMockPost({
      id: "current",
      category: "models",
      type: "discussion",
      relatedEntities: [{ kind: "model", id: "m1", name: "M1" }],
    });

    const unrelatedPost = createMockPost({
      id: "unrelated",
      category: "tools",
      type: "question",
      relatedEntities: [{ kind: "tool", id: "t99", name: "T99" }],
    });

    const related = computeRelatedPosts(current, [unrelatedPost]);
    expect(related).toHaveLength(0);
  });
});
