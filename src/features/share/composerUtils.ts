import { parseSpans, relatedFromSpans } from "../../services/content";
import type { EntityRef } from "../../types/entities";
import type { CreatePostInput, PostType } from "../../types/posts";
import type { ComposerState } from "./types";

/**
 * Derives a post title from content (first line / up to 80 chars) for DB schema compatibility.
 */
export function deriveTitle(content: string, fallback = "Публикация"): string {
  const trimmed = content.trim();
  if (!trimmed) return fallback;

  const firstLine = trimmed.split("\n")[0].trim();
  if (!firstLine) return fallback;

  if (firstLine.length <= 80) {
    return firstLine;
  }

  // Truncate at word boundary if possible
  const truncated = firstLine.slice(0, 77);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 40) {
    return truncated.slice(0, lastSpace).trim() + "...";
  }
  return truncated.trim() + "...";
}

/**
 * Checks if a string looks like a valid URL or web address.
 */
export function isValidUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(full);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

/**
 * Normalizes user input into a full https URL.
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export type PendingLinkCommitResult =
  | { status: "attached"; state: ComposerState }
  | { status: "empty"; state: ComposerState }
  | { status: "invalid"; state: ComposerState };

/**
 * Commits the URL draft without relying on a React state update having flushed.
 * An empty draft is an intentional no-link state; an invalid draft blocks submit.
 */
export function commitPendingLink(
  state: ComposerState,
  draft: string,
): PendingLinkCommitResult {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { status: "empty", state };
  }

  if (!isValidUrl(trimmed)) {
    return { status: "invalid", state };
  }

  return {
    status: "attached",
    state: { ...state, link: normalizeUrl(trimmed) },
  };
}

/**
 * Keeps link storage canonical when a post is edited. Project links use the
 * existing repositoryUrl key; all other post types use extras.url.
 */
export function getPostLink(extras: Record<string, string>): string | undefined {
  return extras.url || extras.repositoryUrl || undefined;
}

export function updatePostLinkExtras(
  extras: Record<string, string>,
  type: PostType,
  link?: string,
): Record<string, string> {
  const next = { ...extras };
  delete next.url;
  delete next.repositoryUrl;

  const trimmed = link?.trim();
  if (trimmed) {
    next[type === "project" ? "repositoryUrl" : "url"] = normalizeUrl(trimmed);
  }

  return next;
}

/**
 * Extracts a clean domain from a URL for preview.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

/**
 * Formats a URL for compact display as a chip/badge.
 */
export function formatUrlPreview(url: string, maxLength = 36): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    const domain = parsed.hostname.replace(/^www\./i, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const full = `${domain}${path}`;
    return full.length > maxLength
      ? full.slice(0, maxLength - 3) + "..."
      : full;
  } catch {
    return url.length > maxLength
      ? url.slice(0, maxLength - 3) + "..."
      : url;
  }
}

/**
 * Deduplicates an array of entities by kind + ID.
 */
export function deduplicateEntities(entities: EntityRef[]): EntityRef[] {
  const seen = new Set<string>();
  const result: EntityRef[] = [];
  for (const entity of entities) {
    const key = `${entity.kind}:${entity.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entity);
    }
  }
  return result;
}

/**
 * Parses valid mentions in content and syncs them into the entities list.
 * Only entities currently present in text are preserved, eliminating stale metadata.
 */
export function resolveEntitiesFromContent(
  text: string,
  availableEntities: EntityRef[],
  fallbackEntities: EntityRef[] = [],
): EntityRef[] {
  if (!text.trim()) {
    return fallbackEntities;
  }
  const spans = parseSpans(text, availableEntities);
  const mentioned = relatedFromSpans(spans);
  return deduplicateEntities(mentioned);
}

/**
 * Checks if current composer state has unsaved modifications compared to baseline.
 */
export function isComposerDirty(
  current: ComposerState,
  baseline: ComposerState,
): boolean {
  if (current.content.trim() !== baseline.content.trim()) return true;
  if (current.type !== baseline.type) return true;
  if (current.category !== baseline.category) return true;
  if ((current.link?.trim() ?? "") !== (baseline.link?.trim() ?? "")) return true;
  if (current.entities.length !== baseline.entities.length) return true;
  const currentEntityIds = current.entities.map((e) => e.id).sort().join(",");
  const baselineEntityIds = baseline.entities.map((e) => e.id).sort().join(",");
  if (currentEntityIds !== baselineEntityIds) return true;

  return false;
}

/**
 * Builds the CreatePostInput payload for repository / Supabase creation.
 */
export function buildCreatePostInput(state: ComposerState): CreatePostInput {
  const trimmed = state.content.trim();
  const fallbackTitle =
    state.entities.length > 0
      ? `Обсуждение: ${state.entities[0].name}`
      : "Публикация";

  const title = deriveTitle(trimmed, fallbackTitle);
  const extras: Record<string, string> = {};

  if (state.link?.trim()) {
    const normalized = normalizeUrl(state.link);
    if (state.type === "project") {
      extras.repositoryUrl = normalized;
    } else {
      extras.url = normalized;
    }
  }

  return {
    type: state.type,
    category: state.category || undefined,
    title,
    content: trimmed,
    tags: [],
    extras,
  };
}
