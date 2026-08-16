import { describe, expect, it } from "vitest";
import { addComment, createPost } from "./posts";
import type { EntityRef } from "../types/entities";
import type { CreatePostInput } from "../types/posts";

const ENTITIES: EntityRef[] = [{ kind: "model", id: "openai/gpt-4o", name: "GPT-4o" }];

const INPUT: CreatePostInput = {
  type: "discussion",
  title: "Тест",
  content: "Обсуждаем @GPT-4o",
  tags: ["test"],
  extras: {},
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

describe("createPost", () => {
  it("создаёт пост с ISO-датой", () => {
    const post = createPost(INPUT, ENTITIES);
    expect(post.createdAt).toMatch(ISO_DATE);
    expect(new Date(post.createdAt).getTime()).not.toBeNaN();
  });

  it("связывает упомянутые сущности", () => {
    const post = createPost(INPUT, ENTITIES);
    expect(post.relatedEntities).toEqual([ENTITIES[0]]);
  });
});

describe("addComment", () => {
  it("добавляет комментарий с ISO-датой", () => {
    const post = createPost(INPUT, ENTITIES);
    const next = addComment([post], post.id, "ответ");
    const comment = next[0].comments[0];
    expect(comment.content).toBe("ответ");
    expect(comment.createdAt).toMatch(ISO_DATE);
  });
});
