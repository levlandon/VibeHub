import type { EntityRef, Model, Tool } from "../types/hub";
import type { ChatAuthor } from "../types/hub";
import { CURRENT_USER } from "../data/site";

const AUTHORS: ChatAuthor[] = [CURRENT_USER];

/**
 * Strips provider prefixes and technical slugs to return purely the human-readable model name.
 * Examples:
 * - "Anthropic: Claude Opus 4.1" -> "Claude Opus 4.1"
 * - "Anthropic · Claude 3.7 Sonnet" -> "Claude 3.7 Sonnet"
 * - "OpenAI: GPT-5.6 Sol" -> "GPT-5.6 Sol"
 * - "Anthropic Claude 3.5 Sonnet", provider: "Anthropic" -> "Claude 3.5 Sonnet"
 */
export function cleanModelName(rawName: string, provider?: string): string {
  if (!rawName) return "";
  let name = rawName.trim();

  // Strip "Provider: " (e.g. "OpenAI: GPT-5.6 Sol" -> "GPT-5.6 Sol")
  if (name.includes(": ")) {
    name = name.slice(name.indexOf(": ") + 2).trim();
  } else if (name.includes(" · ")) {
    // Strip "Provider · " (e.g. "Anthropic · Claude Opus 4.1" -> "Claude Opus 4.1")
    name = name.slice(name.indexOf(" · ") + 3).trim();
  } else if (
    provider &&
    name.toLowerCase().startsWith(provider.toLowerCase() + " - ")
  ) {
    name = name.slice(provider.length + 3).trim();
  }

  // Strip "provider/" prefix if still present (e.g. "openai/gpt-4" -> "gpt-4")
  if (name.includes("/")) {
    name = name.slice(name.lastIndexOf("/") + 1).trim();
  }

  // If provider name is prefixed at the start without colon/separator, e.g. "Anthropic Claude 3.7" -> "Claude 3.7"
  if (provider && provider.trim()) {
    const p = provider.trim().toLowerCase();
    if (name.toLowerCase().startsWith(p + " ")) {
      name = name.slice(provider.trim().length + 1).trim();
    }
  }

  return name || rawName;
}

export function catalogIndex(models: Model[], tools: Tool[]): EntityRef[] {
  return [
    ...models.map((m) => ({
      kind: "model" as const,
      id: m.id,
      name: cleanModelName(m.name, m.provider),
    })),
    ...tools.map((t) => ({ kind: "tool" as const, id: t.id, name: t.name })),
  ].sort((a, b) => b.name.length - a.name.length);
}

export function mentionIndex(
  models: Model[],
  tools: Tool[],
  extraAuthors: ChatAuthor[] = [],
): EntityRef[] {
  const combinedAuthors = [...AUTHORS, ...extraAuthors];
  const seen = new Set<string>();
  const users: EntityRef[] = [];

  for (const a of combinedAuthors) {
    const id = a.handle || a.id || "";
    if (id && !seen.has(id)) {
      seen.add(id);
      users.push({
        kind: "user",
        id,
        name: a.name,
      });
    }
  }

  return [...catalogIndex(models, tools), ...users].sort(
    (a, b) => b.name.length - a.name.length,
  );
}

export function filterEntities(query: string, entities: EntityRef[]): EntityRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return entities;
  return entities.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q.replace(/\s+/g, "-")),
  );
}

export function atQuery(value: string, caret: number) {
  if (caret <= 0) return null;
  const before = value.slice(0, caret);
  const idx = before.lastIndexOf("@");
  if (idx < 0) return null;

  // @ must be at start of string or preceded by whitespace / punctuation (not email address)
  if (idx > 0 && !/[\s\n([{'"“«]/.test(before[idx - 1])) return null;

  const query = before.slice(idx + 1);

  // If query contains newlines, it's not an active mention
  if (query.includes("\n")) return null;

  // Once user types a space after mention, or if there are multiple spaces, mention is completed
  if (query.endsWith(" ") || query.includes("  ")) return null;

  // Limit multi-word search to 2 words
  if (query.split(" ").length > 2) return null;

  return { start: idx, query };
}

export interface InsertMentionParams {
  text: string;
  mentionStart: number;
  mentionEnd: number;
  label: string;
  addTrailingSpace?: boolean;
}

export interface InsertMentionResult {
  nextText: string;
  nextCursorPosition: number;
}

/**
 * Pure helper to replace an active @query range with a chosen entity display label
 * and compute the next cursor position immediately after the inserted mention.
 */
export function insertMention({
  text,
  mentionStart,
  mentionEnd,
  label,
  addTrailingSpace = true,
}: InsertMentionParams): InsertMentionResult {
  const safeStart = Math.max(0, Math.min(mentionStart, text.length));
  const safeEnd = Math.max(safeStart, Math.min(mentionEnd, text.length));
  const prefix = text.slice(0, safeStart);
  const rawSuffix = text.slice(safeEnd);

  const cleanLabel = cleanModelName(label);
  const mention = `@${cleanLabel}${addTrailingSpace ? " " : ""}`;
  const suffix =
    addTrailingSpace && rawSuffix.startsWith(" ")
      ? rawSuffix.slice(1)
      : rawSuffix;

  const nextText = `${prefix}${mention}${suffix}`;
  const nextCursorPosition = prefix.length + mention.length;

  return { nextText, nextCursorPosition };
}
