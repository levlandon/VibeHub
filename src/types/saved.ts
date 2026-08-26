import type { EntityKind } from "./entities";

export type BookmarkType = "model" | "tool" | "repository" | "post";

export interface RepositoryBookmark {
  id: string;
  type: "repository";
  name: string;
  owner: string;
  url: string;
  description?: string;
  avatar?: string;
  savedAt: string;
}

export interface SavedItem {
  id: string;
  kind: EntityKind | BookmarkType;
  targetId: string;
  title: string;
  subtitle?: string;
  url?: string;
  savedAt: string;
  owner?: string;
  name?: string;
  description?: string;
  avatar?: string;
}

