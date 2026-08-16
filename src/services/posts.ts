import { CURRENT_USER } from "../data/site";
import { parseSpans, relatedFromSpans } from "./content";
import type { EntityRef } from "../types/entities";
import type { CreatePostInput, Post, PostComment } from "../types/posts";

export function createPost(input: CreatePostInput, entities: EntityRef[]): Post {
  const spans = parseSpans(input.content, entities);
  return {
    id: `post-${Date.now()}`,
    type: input.type,
    author: CURRENT_USER,
    title: input.title.trim(),
    content: input.content.trim(),
    createdAt: new Date().toISOString(),
    tags: input.tags,
    relatedEntities: relatedFromSpans(spans),
    reactions: [],
    comments: [],
    extras: input.extras,
    ...(input.type === "question" ? { solved: false } : {}),
  };
}

export function addComment(posts: Post[], postId: string, content: string): Post[] {
  const comment: PostComment = {
    id: `c-${Date.now()}`,
    author: CURRENT_USER,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  return posts.map((post) =>
    post.id === postId ? { ...post, comments: [...post.comments, comment] } : post,
  );
}

export function acceptAnswer(posts: Post[], postId: string, commentId: string): Post[] {
  return posts.map((post) =>
    post.id === postId && post.type === "question"
      ? { ...post, solved: true, acceptedAnswerId: commentId }
      : post,
  );
}

export function postsForEntity(posts: Post[], kind: string, id: string) {
  return posts.filter((post) =>
    post.relatedEntities.some((ref) => ref.kind === kind && ref.id === id),
  );
}

export function filterPosts(posts: Post[], type: string) {
  if (type === "all") return posts;
  return posts.filter((post) => post.type === type);
}

