import { matchesQuery } from "../lib/search";
import type { Model, Tool } from "../types/hub";
import type { Post } from "../types/posts";
import type { SearchHit } from "../types/search";
import { postTypeConfig } from "../config/postTypes";

export function searchHub(
  query: string,
  models: Model[],
  tools: Tool[],
  posts: Post[],
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];

  const modelHits: SearchHit[] = models
    .filter((m) =>
      matchesQuery(
        `${m.name} ${m.provider} ${m.id} ${m.description ?? ""} ${m.capabilities.join(" ")}`,
        q,
      ),
    )
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      kind: "model",
      group: "Модели",
      title: m.name,
      meta: `${m.provider} · ${m.contextWindow}`,
      route: "models",
    }));

  const toolHits: SearchHit[] = tools
    .filter((t) =>
      matchesQuery(
        `${t.name} ${t.typeLabel} ${t.summary || ""} ${t.tags.join(" ")}`,
        q,
      ),
    )
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      kind: "tool",
      group: "Инструменты",
      title: t.name,
      meta: `${t.typeLabel} · ${t.category}`,
      route: "tools",
    }));

  const postHits: SearchHit[] = posts
    .filter((p) =>
      matchesQuery(`${p.title} ${p.content} ${p.tags.join(" ")}`, q),
    )
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      kind: "post",
      group: postTypeConfig(p.type).label,
      title: p.title,
      meta: p.author.name,
    }));

  return [...modelHits, ...toolHits, ...postHits];
}

export function groupHits(hits: SearchHit[]) {
  const order: string[] = [];
  const map = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    if (!map.has(hit.group)) {
      map.set(hit.group, []);
      order.push(hit.group);
    }
    map.get(hit.group)!.push(hit);
  }
  return order.map((group) => ({ group, items: map.get(group)! }));
}
