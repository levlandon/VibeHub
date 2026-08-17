import type { CatalogKind } from "../types/entities";
import type { Route } from "../types/hub";

export interface EntityView {
  kind: CatalogKind;
  id: string;
}

export function routeFromPath(pathname: string): Route {
  if (pathname.startsWith("/tools")) return "tools";
  if (pathname.startsWith("/benchmarks")) return "benchmarks";
  if (pathname.startsWith("/saved")) return "saved";
  if (pathname.startsWith("/bookmarks")) return "saved";
  if (pathname.startsWith("/collections")) return "saved";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/feed")) return "feed";
  if (pathname.startsWith("/people")) return "people";
  return "models";
}

export function entityFromPath(pathname: string): EntityView | null {
  const modelMatch = pathname.match(/^\/models\/(.+)$/);
  if (modelMatch) return { kind: "model", id: modelMatch[1] };
  const toolMatch = pathname.match(/^\/tools\/(.+)$/);
  if (toolMatch) return { kind: "tool", id: toolMatch[1] };
  return null;
}

export function entityPath(view: EntityView): string {
  return view.kind === "model" ? `/models/${view.id}` : `/tools/${view.id}`;
}
