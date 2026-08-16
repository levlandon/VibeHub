import { postTypeConfig } from "../../config/postTypes";
import { emptyDraft, type PostDraft } from "./types";
import type { PostType } from "../../types/posts";

export function initialDraft(type: PostType): PostDraft {
  const extras: Record<string, string> = {};
  for (const field of postTypeConfig(type).fields) extras[field.key] = "";
  return emptyDraft(extras);
}
