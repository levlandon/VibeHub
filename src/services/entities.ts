import type { EntityRef, Model, Tool } from "../types/hub";
import type { ChatAuthor } from "../types/hub";
import { CURRENT_USER } from "../data/site";

const AUTHORS: ChatAuthor[] = [CURRENT_USER];

export function catalogIndex(models: Model[], tools: Tool[]): EntityRef[] {
  return [
    ...models.map((m) => ({ kind: "model" as const, id: m.id, name: m.name })),
    ...tools.map((t) => ({ kind: "tool" as const, id: t.id, name: t.name })),
  ].sort((a, b) => b.name.length - a.name.length);
}

export function mentionIndex(models: Model[], tools: Tool[]): EntityRef[] {
  const users: EntityRef[] = AUTHORS.map((a) => ({
    kind: "user",
    id: a.handle,
    name: a.name,
  }));
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
  const before = value.slice(0, caret);
  const idx = before.lastIndexOf("@");
  if (idx < 0) return null;
  const query = before.slice(idx + 1);
  if (query.includes("\n")) return null;
  if (/\s{2}/.test(query)) return null;
  return { start: idx, query };
}
