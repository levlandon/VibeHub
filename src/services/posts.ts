import { CURRENT_USER } from "../data/site";
import { parseSpans, relatedFromSpans } from "./content";
import type { EntityRef } from "../types/entities";
import type { CreatePostInput, Post, PostComment } from "../types/posts";

export function createPost(input: CreatePostInput, entities: EntityRef[]): Post {
  const spans = parseSpans(input.content, entities);
  return {
    id: `post-${Date.now()}`,
    type: input.type,
    category: input.category,
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

export function addComment(
  posts: Post[],
  postId: string,
  content: string,
  parentCommentId?: string | null,
  replyToCommentId?: string | null,
): Post[] {
  const comment: PostComment = {
    id: `c-${Date.now()}`,
    author: CURRENT_USER,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    ...(parentCommentId ? { parentCommentId } : {}),
    ...(replyToCommentId ? { replyToCommentId } : {}),
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

export function filterPostsByCategory(
  posts: Post[],
  category: "all" | "models" | "tools" | "agents" | "mcp" | string,
): Post[] {
  if (category === "all") return posts;
  const cat = category.toLowerCase();
  return posts.filter((post) => {
    if (post.category && post.category.toLowerCase() === cat) return true;
    if (
      post.tags &&
      post.tags.some(
        (t) =>
          t.toLowerCase() === cat ||
          (cat === "models" && t.toLowerCase() === "модели") ||
          (cat === "tools" && t.toLowerCase() === "инструменты") ||
          (cat === "agents" && t.toLowerCase() === "агенты"),
      )
    ) {
      return true;
    }
    if (cat === "models" && post.relatedEntities.some((ref) => ref.kind === "model")) return true;
    if (cat === "tools" && post.relatedEntities.some((ref) => ref.kind === "tool")) return true;
    return false;
  });
}

export function updatePost(
  posts: Post[],
  postId: string,
  input: Partial<CreatePostInput>,
  entities: EntityRef[] = [],
): Post[] {
  return posts.map((post) => {
    if (post.id !== postId) return post;
    const title = input.title !== undefined ? input.title.trim() : post.title;
    const content = input.content !== undefined ? input.content.trim() : post.content;
    const category = input.category !== undefined ? input.category : post.category;
    const tags = input.tags !== undefined ? input.tags : post.tags;
    const extras = input.extras !== undefined ? input.extras : post.extras;
    const type = input.type !== undefined ? input.type : post.type;
    const spans = parseSpans(content, entities);
    return {
      ...post,
      type,
      category,
      title,
      content,
      tags,
      extras,
      relatedEntities: relatedFromSpans(spans),
    };
  });
}

export function deletePost(posts: Post[], postId: string): Post[] {
  return posts.filter((p) => p.id !== postId);
}

