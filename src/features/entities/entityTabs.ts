import type { CatalogKind } from "../../types/entities";

export const ENTITY_TABS: Record<
  CatalogKind,
  { id: string; label: string }[]
> = {
  model: [
    { id: "overview", label: "Обзор" },
    { id: "benchmarks", label: "Бенчмарки" },
    { id: "discussions", label: "Обсуждения" },
  ],
  tool: [
    { id: "overview", label: "Обзор" },
    { id: "discussions", label: "Обсуждения" },
    { id: "guides", label: "Гайды" },
  ],
};
