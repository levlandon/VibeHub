import type { ContentSpan, EntityRef } from "../types/entities";

export function parseSpans(text: string, entities: EntityRef[]): ContentSpan[] {
  const parts: ContentSpan[] = [];
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at === -1) {
      parts.push({ type: "text", value: text.slice(i) });
      break;
    }
    if (at > i) parts.push({ type: "text", value: text.slice(i, at) });
    const rest = text.slice(at + 1);
    const hit = entities.find((e) =>
      rest.toLowerCase().startsWith(e.name.toLowerCase()),
    );
    if (hit) {
      parts.push({ type: "mention", entity: hit });
      i = at + 1 + hit.name.length;
    } else {
      parts.push({ type: "text", value: "@" });
      i = at + 1;
    }
  }
  return parts;
}

export function relatedFromSpans(spans: ContentSpan[]): EntityRef[] {
  const seen = new Set<string>();
  const refs: EntityRef[] = [];
  for (const span of spans) {
    if (span.type !== "mention") continue;
    if (span.entity.kind !== "model" && span.entity.kind !== "tool") continue;
    const key = `${span.entity.kind}:${span.entity.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(span.entity);
  }
  return refs;
}
