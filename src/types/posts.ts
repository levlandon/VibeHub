import type { EntityRef } from "./entities";
import type { ChatAuthor } from "./hub";

export type PostType =
  | "discussion"
  | "question"
  | "project"
  | "guide"
  | "resource";

export type PostTopicCategory = "models" | "tools" | "agents" | "mcp";
export type PostCategory = "all" | PostTopicCategory;

export interface PostComment {
  id: string;
  author: ChatAuthor;
  content: string;
  createdAt: string;
  parentCommentId?: string | null;
  replyToCommentId?: string | null;
  deletedAt?: string | null;
}

export interface PostBase {
  id: string;
  type: PostType;
  category?: PostTopicCategory;
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
  category?: PostTopicCategory;
  title: string;
  content: string;
  tags: string[];
  extras: Record<string, string>;
}
