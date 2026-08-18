import { describe, expect, it } from "vitest";
import { mapAuthor, mapComment, mapPost } from "./mapper";
import type { ChatAuthor } from "../../types/hub";
import type { PostComment, PostType } from "../../types/posts";

const ISO_DATE = "2026-08-18T10:00:00.000Z";

function profileRow(p: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Alice",
    handle: "alice",
    initials: "A",
    ...p,
  };
}

function commentRow(p: Partial<Record<string, unknown>> = {}) {
  return {
    id: "c1",
    content: "comment",
    created_at: ISO_DATE,
    author: profileRow(),
    ...p,
  };
}

function postRow(p: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1",
    type: "discussion",
    title: "Title",
    content: "Content",
    created_at: ISO_DATE,
    author: profileRow(),
    tags: ["tag1"],
    related_entities: [{ kind: "model", id: "gpt-4", name: "GPT-4" }],
    reactions: [{ emoji: "👍", count: 3 }],
    comments: [],
    extras: { key: "value" },
    ...p,
  };
}

describe("mapAuthor", () => {
  it("маппит объект профиля в ChatAuthor", () => {
    const author = mapAuthor(profileRow());

    expect(author).toEqual<ChatAuthor>({
      name: "Alice",
      handle: "alice",
      initials: "A",
    });
  });

  it("возвращает значения по умолчанию для массива", () => {
    const author = mapAuthor([
      profileRow({ name: "Alice" }),
      { name: "Bob" },
    ]);

    expect(author).toEqual<ChatAuthor>({
      name: "Unknown",
      handle: "unknown",
      initials: "?",
    });
  });

  it("возвращает значения по умолчанию для невалидного значения", () => {
    expect(mapAuthor("not an object")).toEqual<ChatAuthor>({
      name: "Unknown",
      handle: "unknown",
      initials: "?",
    });
    expect(mapAuthor(123)).toEqual<ChatAuthor>({
      name: "Unknown",
      handle: "unknown",
      initials: "?",
    });
  });

  it("возвращает значения по умолчанию для null", () => {
    expect(mapAuthor(null)).toEqual<ChatAuthor>({
      name: "Unknown",
      handle: "unknown",
      initials: "?",
    });
  });
});

describe("mapComment", () => {
  it("маппит валидный комментарий", () => {
    const comment = mapComment(commentRow());

    expect(comment).toEqual<PostComment>({
      id: "c1",
      author: { name: "Alice", handle: "alice", initials: "A" },
      content: "comment",
      createdAt: ISO_DATE,
    });
  });

  it("возвращает null для невалидного комментария", () => {
    expect(mapComment(null)).toBeNull();
    expect(mapComment({})).toBeNull();
    expect(mapComment({ id: "c1" })).toBeNull();
  });
});

describe("mapPost", () => {
  it.each(["discussion", "question", "project", "guide", "resource"] as PostType[])(
    "маппит пост типа %s",
    (type) => {
      const post = mapPost(postRow({ type }));

      expect(post).not.toBeNull();
      expect(post?.type).toBe(type);
      expect(post?.createdAt).toBe(ISO_DATE);
    },
  );

  it("маппит автора поста", () => {
    const post = mapPost(
      postRow({
        author: profileRow({ name: "Bob", handle: "bob", initials: "B" }),
      }),
    );

    expect(post?.author).toEqual<ChatAuthor>({
      name: "Bob",
      handle: "bob",
      initials: "B",
    });
  });

  it("маппит tags, related_entities, reactions, extras", () => {
    const post = mapPost(postRow());

    expect(post?.tags).toEqual(["tag1"]);
    expect(post?.relatedEntities).toEqual([
      { kind: "model", id: "gpt-4", name: "GPT-4" },
    ]);
    expect(post?.reactions).toEqual([{ emoji: "👍", count: 3 }]);
    expect(post?.extras).toEqual({ key: "value" });
  });

  it("маппит comments", () => {
    const post = mapPost(
      postRow({
        comments: [commentRow({ id: "c2", content: "reply" })],
      }),
    );

    expect(post?.comments).toHaveLength(1);
    expect(post?.comments[0].id).toBe("c2");
    expect(post?.comments[0].content).toBe("reply");
  });

  it("question solved=true с acceptedAnswerId", () => {
    const post = mapPost(
      postRow({
        type: "question",
        solved: true,
        accepted_answer_id: "a1",
      }),
    );

    expect(post?.solved).toBe(true);
    expect(post?.acceptedAnswerId).toBe("a1");
  });

  it("question без acceptedAnswerId", () => {
    const post = mapPost(postRow({ type: "question" }));

    expect(post?.solved).toBe(false);
    expect(post?.acceptedAnswerId).toBeUndefined();
  });

  it("невалидные JSON-поля заменяются на пустые значения", () => {
    const post = mapPost(
      postRow({
        tags: null,
        related_entities: "not-array",
        reactions: 123,
        extras: null,
        comments: "not-array",
      }),
    );

    expect(post?.tags).toEqual([]);
    expect(post?.relatedEntities).toEqual([]);
    expect(post?.reactions).toEqual([]);
    expect(post?.extras).toEqual({});
    expect(post?.comments).toEqual([]);
  });

  it("возвращает null для невалидного значения строки", () => {
    expect(mapPost(null)).toBeNull();
    expect(mapPost("string")).toBeNull();
    expect(mapPost(123)).toBeNull();
  });

  it("возвращает null для строки без обязательных полей", () => {
    expect(mapPost({})).toBeNull();
    expect(mapPost({ id: "x" })).toBeNull();
    expect(mapPost({ id: "x", type: "unknown" })).toBeNull();
    expect(mapPost({ id: "x", type: "discussion", title: "T" })).toBeNull();
  });
});
