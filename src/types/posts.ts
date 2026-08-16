import type { EntityRef } from "./entities";
import type { ChatAuthor } from "./hub";

export type PostType =
  | "discussion"
  | "question"
  | "project"
  | "guide"
  | "resource";

export interface PostComment {
  id: string;
  author: ChatAuthor;
  content: string;
  createdAt: string;
}

export interface PostBase {
  id: string;
  type: PostType;
  author: ChatAuthor;
  title: string;
  content: string;
  createdAt: string;
  tags: string[];
  relatedEntities: EntityRef[];
  reactions: { emoji: string; count: number }[];
  comments: PostComment[];
  extras: Record<string, string>;
}

export interface QuestionFields {
  solved: boolean;
  acceptedAnswerId?: string;
}

export type Post = PostBase & Partial<QuestionFields>;

export interface CreatePostInput {
  type: PostType;
  title: string;
  content: string;
  tags: string[];
  extras: Record<string, string>;
}
