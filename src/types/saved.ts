import type { EntityKind } from "./entities";

export interface SavedItem {
  id: string;
  kind: EntityKind;
  targetId: string;
  title: string;
  subtitle?: string;
  url?: string;
  savedAt: string;
}
