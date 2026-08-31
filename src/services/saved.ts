import type { EntityKind } from "../types/entities";
import type { Tool } from "../types/hub";
import type { Post, PostComment } from "../types/posts";
import type { BookmarkType, SavedItem } from "../types/saved";
import { postTypeConfig } from "../config/postTypes";

export function savedId(kind: EntityKind | BookmarkType, targetId: string) {
  return `${kind}:${targetId}`;
}

export function isSaved(items: SavedItem[], kind: EntityKind | BookmarkType, targetId: string) {
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

export function parseGithubUrl(rawUrl: string): { owner: string; name: string; url: string } | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const httpMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/.*)?$/,
  );
  if (httpMatch) {
    const owner = httpMatch[1];
    const name = httpMatch[2].replace(/\.git$/, "");
    return {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    };
  }

  const shortMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shortMatch) {
    const owner = shortMatch[1];
    const name = shortMatch[2].replace(/\.git$/, "");
    return {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    };
  }

  return null;
}

export function describeRepository(input: {
  url: string;
  name?: string;
  owner?: string;
  description?: string;
  avatar?: string;
}): Omit<SavedItem, "id" | "savedAt"> {
  const parsed = parseGithubUrl(input.url);
  const owner = input.owner || parsed?.owner || "github";
  const name = input.name || parsed?.name || input.url;
  const canonicalUrl = parsed?.url || input.url;
  const targetId = `${owner}/${name}`;

  return {
    kind: "repository",
    targetId,
    title: name,
    subtitle: owner,
    url: canonicalUrl,
    owner,
    name,
    description: input.description,
    avatar: input.avatar,
  };
}

export function describePost(post: Post): Omit<SavedItem, "id" | "savedAt"> {
  return {
    kind: "post",
    targetId: post.id,
    title: post.title,
    subtitle: postTypeConfig(post.type).label,
    url: post.extras.url || post.extras.repositoryUrl,
    authorName: post.author.name,
    authorHandle: post.author.handle,
    authorAvatar: post.author.avatarUrl,
    description: post.content.slice(0, 160),
  };
}

export function describeComment(
  comment: PostComment,
  post: Post,
): Omit<SavedItem, "id" | "savedAt"> {
  const excerpt = comment.content.length > 140
    ? `${comment.content.slice(0, 140)}...`
    : comment.content;

  return {
    kind: "comment",
    targetId: comment.id,
    title: excerpt,
    subtitle: post.title,
    url: `/posts/${post.id}?comment=${comment.id}`,
    postId: post.id,
    commentId: comment.id,
    authorName: comment.author.name,
    authorHandle: comment.author.handle,
    authorAvatar: comment.author.avatarUrl,
    description: comment.content,
  };
}

