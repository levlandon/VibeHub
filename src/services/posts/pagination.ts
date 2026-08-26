import type { PostsCursor } from "./types";

/**
 * Deterministic comparison for posts ordered by `createdAt DESC, id DESC`.
 */
export function comparePostsDesc(
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string },
): number {
  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();
  if (timeB !== timeA) {
    return timeB - timeA;
  }
  return b.id.localeCompare(a.id);
}

/**
 * Returns true if item belongs strictly after the given cursor
 * in the sort order `createdAt DESC, id DESC`.
 */
export function isAfterCursor(
  item: { createdAt: string; id: string },
  cursor: PostsCursor,
): boolean {
  const itemTime = new Date(item.createdAt).getTime();
  const cursorTime = new Date(cursor.createdAt).getTime();
  if (itemTime < cursorTime) {
    return true;
  }
  if (itemTime === cursorTime && item.id < cursor.id) {
    return true;
  }
  return false;
}

/**
 * Builds PostgREST cursor filter query string for compound condition:
 * `created_at < cursor.createdAt OR (created_at = cursor.createdAt AND id < cursor.id)`.
 */
export function buildPostgrestCursorFilter(cursor: PostsCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

/**
 * Pure in-memory cursor pagination for demo fallback / local data.
 */
export function paginateInMemory<T extends { createdAt: string; id: string }>(
  items: readonly T[],
  cursor?: PostsCursor | null,
  limit = 10,
): { items: T[]; nextCursor: PostsCursor | null } {
  const safeLimit = Math.max(1, limit);
  const sorted = [...items].sort(comparePostsDesc);

  const filtered = cursor
    ? sorted.filter((item) => isAfterCursor(item, cursor))
    : sorted;

  const hasNextPage = filtered.length > safeLimit;
  const pageItems = filtered.slice(0, safeLimit);
  const lastItem = pageItems[pageItems.length - 1];

  const nextCursor: PostsCursor | null =
    hasNextPage && lastItem
      ? { createdAt: lastItem.createdAt, id: lastItem.id }
      : null;

  return {
    items: pageItems,
    nextCursor,
  };
}
