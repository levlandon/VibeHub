import type { EntityRef } from "../../types/entities";
import type { PostTopicCategory, PostType } from "../../types/posts";

export interface ComposerState {
  content: string;
  type: PostType;
  category?: PostTopicCategory;
  link?: string;
  entities: EntityRef[];
}

export function emptyComposerState(
  overrides?: Partial<ComposerState>,
): ComposerState {
  return {
    content: "",
    type: "discussion",
    category: undefined,
    link: undefined,
    entities: [],
    ...overrides,
  };
}

export interface PostDraft {
  title: string;
  content: string;
  extras: Record<string, string>;
}

export function emptyDraft(extras: Record<string, string> = {}): PostDraft {
  return { title: "", content: "", extras };
}

export type ShareView =
  | { step: "selecting-type" }
  | { step: "composing"; type: PostType };

