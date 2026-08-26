import { describe, expect, it } from "vitest";
import type { EntityRef } from "../../types/entities";
import type { Post } from "../../types/posts";
import {
  acceptAnswer,
  addComment,
  createPost,
  deletePost,
  mergePostsDeduplicated,
  updatePost,
} from "./postsOperations";

const mockPost1: Post = {
  id: "p1",
  type: "discussion",
  author: { name: "Alice", handle: "alice", initials: "A" },
  title: "Title 1",
  content: "Content 1",
  createdAt: "2026-08-20T10:00:00.000Z",
  tags: ["t1"],
  relatedEntities: [],
  reactions: [],
  comments: [],
  extras: {},
};

const mockPost2: Post = {
  id: "p2",
  type: "discussion",
  author: { name: "Bob", handle: "bob", initials: "B" },
  title: "Title 2",
  content: "Content 2",
  createdAt: "2026-08-19T10:00:00.000Z",
  tags: ["t2"],
  relatedEntities: [],
  reactions: [],
  comments: [],
  extras: {},
};

const mockPost3: Post = {
  id: "p3",
  type: "question",
  author: { name: "Carol", handle: "carol", initials: "C" },
  title: "Title 3",
  content: "Content 3",
  createdAt: "2026-08-18T10:00:00.000Z",
  tags: ["t3"],
  relatedEntities: [],
  reactions: [],
  comments: [],
  extras: {},
  solved: false,
};

describe("postsOperations", () => {
  describe("mergePostsDeduplicated", () => {
    it("добавляет новые посты к существующим", () => {
      const existing = [mockPost1];
      const incoming = [mockPost2];

      const merged = mergePostsDeduplicated(existing, incoming);

      expect(merged).toHaveLength(2);
      expect(merged.map((p) => p.id)).toEqual(["p1", "p2"]);
    });

    it("игнорирует дубликаты ID из входящего списка", () => {
      const existing = [mockPost1];
      const incoming = [mockPost1, mockPost2]; // mockPost1 повторяется

      const merged = mergePostsDeduplicated(existing, incoming);

      expect(merged).toHaveLength(2);
      expect(merged.map((p) => p.id)).toEqual(["p1", "p2"]);
    });

    it("возвращает существующие если incoming пустой", () => {
      const existing = [mockPost1, mockPost2];
      const merged = mergePostsDeduplicated(existing, []);

      expect(merged).toEqual(existing);
    });
  });

  describe("createPost", () => {
    it("создает новый пост с парсингом упоминаний сущностей", () => {
      const entities: EntityRef[] = [{ kind: "model", id: "gpt-4", name: "GPT-4" }];
      const post = createPost(
        {
          type: "discussion",
          title: "New Post",
          content: "Hello @GPT-4",
          tags: ["ai"],
          extras: {},
        },
        entities,
      );

      expect(post.title).toBe("New Post");
      expect(post.type).toBe("discussion");
      expect(post.relatedEntities).toEqual([{ kind: "model", id: "gpt-4", name: "GPT-4" }]);
    });
  });

  describe("updatePost", () => {
    it("обновляет указанный пост", () => {
      const list = [mockPost1, mockPost2];
      const updated = updatePost(list, "p1", { title: "New Title 1" });

      expect(updated[0].title).toBe("New Title 1");
      expect(updated[1].title).toBe("Title 2");
    });
  });

  describe("deletePost", () => {
    it("удаляет указанный пост", () => {
      const list = [mockPost1, mockPost2];
      const after = deletePost(list, "p1");

      expect(after).toHaveLength(1);
      expect(after[0].id).toBe("p2");
    });
  });

  describe("addComment & acceptAnswer", () => {
    it("добавляет комментарий к посту", () => {
      const list = [mockPost3];
      const withComment = addComment(list, "p3", "Great answer!");

      expect(withComment[0].comments).toHaveLength(1);
      expect(withComment[0].comments[0].content).toBe("Great answer!");
    });

    it("отмечает принятый ответ на вопрос", () => {
      const list = [mockPost3];
      const withComment = addComment(list, "p3", "Solution");
      const commentId = withComment[0].comments[0].id;

      const solved = acceptAnswer(withComment, "p3", commentId);

      expect(solved[0].solved).toBe(true);
      expect(solved[0].acceptedAnswerId).toBe(commentId);
    });
  });
});
