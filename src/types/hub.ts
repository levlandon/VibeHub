import type { ContentSpan } from "./entities";

export type { CatalogKind, ContentSpan, EntityKind, EntityRef } from "./entities";

export type Route =
  | "models"
  | "tools"
  | "benchmarks"
  | "bookmarks"
  | "collections";

export type ToolCategory =
  | "coding"
  | "agents"
  | "research"
  | "design"
  | "local-ai";

export type ToolType = "skill" | "mcp" | "plugin" | "cli" | "ide";

export type BenchmarkCategory =
  | "coding"
  | "reasoning"
  | "research"
  | "vision"
  | "speed";

export * from "./models";
export * from "./collections";

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  type: ToolType;
  typeLabel: string;
  tags: string[];
  summary: string;
  compatibility: string[];
  rating?: number;
  ratingsCount?: number;
  bookmarked?: boolean;
}

export interface BenchmarkRow {
  id: string;
  modelId: string;
  modelName: string;
  benchmark: string;
  category: BenchmarkCategory;
  score: number;
  scoreMax?: number;
  communityScore: number;
  source: string;
  updatedAt: string;
}

export interface CurrentUser {
  name: string;
  handle: string;
  initials: string;
}

export type ChatChannelId = "general" | "coding" | "models" | "tools";

export interface ChatAuthor {
  name: string;
  handle: string;
  initials: string;
}

export interface ChatMessage {
  id: string;
  channelId: ChatChannelId;
  author: ChatAuthor;
  text: string;
  spans?: ContentSpan[];
  createdAt: string;
}

export interface QuickAccessSite {
  id: string;
  url: string;
  title: string;
  domain: string;
  favicon: string;
}
