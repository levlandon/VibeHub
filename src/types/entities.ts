export type CatalogKind = "model" | "tool";

export type EntityKind = CatalogKind | "user" | "post" | "url";

export interface EntityRef {
  kind: EntityKind;
  id: string;
  name: string;
}

export type ContentSpan =
  | { type: "text"; value: string }
  | { type: "mention"; entity: EntityRef };
