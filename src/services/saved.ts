import type { EntityKind } from "../types/entities";
import type { Tool } from "../types/hub";
import type { Post } from "../types/posts";
import type { SavedItem } from "../types/saved";
import { postTypeConfig } from "../config/postTypes";

export function savedId(kind: EntityKind, targetId: string) {
  return `${kind}:${targetId}`;
}

export function isSaved(items: SavedItem[], kind: EntityKind, targetId: string) {
  return items.some((item) => item.kind === kind && item.targetId === targetId);
}

export function toggleSaved(
  items: SavedItem[],
  next: Omit<SavedItem, "id" | "savedAt">,
): SavedItem[] {
  if (isSaved(items, next.kind, next.targetId)) {
    return items.filter(
      (item) => !(item.kind === next.kind && item.targetId === next.targetId),
    );
  }
  return [
    {
      ...next,
      id: savedId(next.kind, next.targetId),
      savedAt: new Date().toISOString(),
    },
    ...items,
  ];
}

export function fromBookmarks(tools: Tool[]): SavedItem[] {
  return tools
    .filter((t) => t.bookmarked)
    .map((t) => ({
      id: savedId("tool", t.id),
      kind: "tool" as const,
      targetId: t.id,
      title: t.name,
      subtitle: t.typeLabel,
      savedAt: "",
    }));
}

export function describePost(post: Post): Omit<SavedItem, "id" | "savedAt"> {
  return {
    kind: "post",
    targetId: post.id,
    title: post.title,
    subtitle: postTypeConfig(post.type).label,
    url: post.extras.url || post.extras.repositoryUrl,
  };
}
