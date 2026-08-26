import type { EntityKind, EntityRef } from "../../types/entities";
import type { ChatAuthor } from "../../types/hub";
import type { Post, PostComment, PostType } from "../../types/posts";

const VALID_POST_TYPES = [
  "discussion",
  "question",
  "project",
  "guide",
  "resource",
] as const satisfies readonly PostType[];

const VALID_ENTITY_KINDS = [
  "model",
  "tool",
  "user",
  "post",
  "url",
] as const satisfies readonly EntityKind[];

function isPostType(value: unknown): value is PostType {
  return VALID_POST_TYPES.some((type) => type === value);
}

function isEntityKind(value: unknown): value is EntityKind {
  return VALID_ENTITY_KINDS.some((kind) => kind === value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeEntityRefs(value: unknown): EntityRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is EntityRef => {
    if (item === null || typeof item !== "object") return false;
    const ref = item as Record<string, unknown>;
    return (
      isEntityKind(ref.kind) &&
      isString(ref.id) &&
      isString(ref.name)
    );
  });
}

function normalizeReactions(value: unknown): { emoji: string; count: number }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item === null || typeof item !== "object") return null;
      const reaction = item as Record<string, unknown>;
      const emoji = asString(reaction.emoji);
      const count = asNumber(reaction.count);
      return emoji ? { emoji, count } : null;
    })
    .filter((item): item is { emoji: string; count: number } => item !== null);
}

function normalizeExtras(value: unknown): Record<string, string> {
  if (value === null || typeof value !== "object") return {};
  const record: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string") {
      record[key] = val;
    }
  }
  return record;
}

function resolveJoinedRow(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function mapAuthor(profile: unknown, fallbackId?: string): ChatAuthor {
  const p = resolveJoinedRow(profile);
  const id = isString(p?.id) ? p.id : fallbackId;
  return {
    ...(id ? { id } : {}),
    name: asString(p?.name, "Unknown"),
    handle: asString(p?.handle, "unknown"),
    initials: asString(p?.initials, "?"),
  };
}

export function mapComment(row: unknown): PostComment | null {
  if (row === null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;

  if (
    !isString(r.id) ||
    !isString(r.content) ||
    !isString(r.created_at)
  ) {
    return null;
  }

  return {
    id: r.id,
    author: mapAuthor(r.author, isString(r.author_id) ? r.author_id : undefined),
    content: r.content,
    createdAt: r.created_at,
  };
}

export function mapPost(row: unknown): Post | null {
  if (row === null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;

  if (
    !isString(r.id) ||
    !isPostType(r.type) ||
    !isString(r.title) ||
    !isString(r.content) ||
    !isString(r.created_at)
  ) {
    return null;
  }

  const commentsInput = Array.isArray(r.comments) ? r.comments : [];
  const comments = commentsInput
    .map(mapComment)
    .filter((item): item is PostComment => item !== null);

  const base: Post = {
    id: r.id,
    type: r.type,
    author: mapAuthor(r.author, isString(r.author_id) ? r.author_id : undefined),
    title: r.title,
    content: r.content,
    createdAt: r.created_at,
    tags: normalizeStringArray(r.tags),
    relatedEntities: normalizeEntityRefs(r.related_entities),
    reactions: normalizeReactions(r.reactions),
    comments,
    extras: normalizeExtras(r.extras),
  };

  if (r.type === "question") {
    return {
      ...base,
      solved: asBoolean(r.solved, false),
      ...(isString(r.accepted_answer_id)
        ? { acceptedAnswerId: r.accepted_answer_id }
        : {}),
    };
  }

  return base;
}
