import { describe, expect, it } from "vitest";
import { parseSpans, relatedFromSpans } from "./content";
import type { EntityRef } from "../types/entities";

const ENTITIES: EntityRef[] = [
  { kind: "model", id: "moonshotai/kimi-k2", name: "Kimi K2" },
  { kind: "tool", id: "codex-cli", name: "Codex CLI" },
  { kind: "user", id: "user", name: "User" },
];

describe("parseSpans", () => {
  it("разбирает упоминания сущностей", () => {
    const spans = parseSpans("Сравни @Kimi K2 с @Codex CLI", ENTITIES);
    const mentions = spans.filter((s) => s.type === "mention");
    expect(mentions).toHaveLength(2);
  });

  it("текст без упоминаний остаётся единым", () => {
    const spans = parseSpans("просто текст", ENTITIES);
    expect(spans).toEqual([{ type: "text", value: "просто текст" }]);
  });

  it("одинокий @ без сущности остаётся текстом", () => {
    const spans = parseSpans("напиши @ , ок?", ENTITIES);
    expect(spans.some((s) => s.type === "text" && s.value.includes("@"))).toBe(true);
  });
});

describe("relatedFromSpans", () => {
  it("собирает уникальные упомянутые модели и инструменты", () => {
    const spans = parseSpans("@Kimi K2 и ещё раз @Kimi K2 и @Codex CLI", ENTITIES);
    const related = relatedFromSpans(spans);
    expect(related).toHaveLength(2);
    expect(related.map((r) => r.kind)).toEqual(["model", "tool"]);
  });
});