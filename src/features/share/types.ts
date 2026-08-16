import type { PostType } from "../../types/posts";

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
