import type { EntityKind } from "./entities";
import type { Route } from "./hub";

export interface SearchHit {
  id: string;
  kind: EntityKind;
  group: string;
  title: string;
  meta: string;
  route?: Route;
}
