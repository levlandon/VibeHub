import { describe, expect, it } from "vitest";
import {
  createMentionElement,
  serializeEditorToTextAndEntities,
} from "../../components/mentions/contentEditableUtils";
import {
  atQuery,
  cleanModelName,
  filterEntities,
  insertMention,
} from "../../services/entities";
import { entityPath } from "../../state/routing";
import type { EntityRef } from "../../types/entities";
import {
  buildCreatePostInput,
  commitPendingLink,
  deduplicateEntities,
  deriveTitle,
  extractDomain,
  formatUrlPreview,
  getPostLink,
  isComposerDirty,
  isValidUrl,
  normalizeUrl,
  resolveEntitiesFromContent,
  updatePostLinkExtras,
} from "./composerUtils";
import { emptyComposerState } from "./types";

import type { MinimalDOMNode } from "../../components/mentions/contentEditableUtils";

function createMockDoc() {
  return {
    createElement: (tag: string) => {
      const attrs = new Map<string, string>();
      const children: MinimalDOMNode[] = [];
      const el: MinimalDOMNode = {
        nodeType: 1,
        tagName: tag.toUpperCase(),
        getAttribute: (k: string) => attrs.get(k) ?? null,
        childNodes: children,
      };
      // Extended properties for mock
      Object.assign(el, {
        setAttribute: (k: string, v: string) => attrs.set(k, v),
        className: "",
        textContent: "",
        appendChild: (child: MinimalDOMNode) => {
          children.push(child);
          return child;
        },
      });
      return el as unknown as HTMLElement;
    },
    createTextNode: (val: string) =>
      ({
        nodeType: 3,
        nodeValue: val,
        textContent: val,
      }) as unknown as Text,
  };
}

describe("Composer Utils & State", () => {
  describe("cleanModelName (Provider stripping for clean visible labels)", () => {
    it("очищает 'Provider: ' из названия модели", () => {
      expect(cleanModelName("Anthropic: Claude Opus 4.1")).toBe("Claude Opus 4.1");
      expect(cleanModelName("OpenAI: GPT-5.6 Sol")).toBe("GPT-5.6 Sol");
    });

    it("очищает 'Provider · ' из названия модели", () => {
      expect(cleanModelName("Anthropic · Claude 3.7 Sonnet")).toBe("Claude 3.7 Sonnet");
    });

    it("очищает префикс провайдера без двоеточия", () => {
      expect(cleanModelName("Anthropic Claude 3.5 Sonnet", "Anthropic")).toBe("Claude 3.5 Sonnet");
      expect(cleanModelName("OpenAI GPT-4o", "OpenAI")).toBe("GPT-4o");
    });

    it("очищает технические id с префиксом provider/", () => {
      expect(cleanModelName("openai/gpt-4o")).toBe("gpt-4o");
      expect(cleanModelName("anthropic/claude-3-7-sonnet")).toBe("claude-3-7-sonnet");
    });

    it("не портит чистые имена моделей", () => {
      expect(cleanModelName("Claude 3.7 Sonnet")).toBe("Claude 3.7 Sonnet");
      expect(cleanModelName("GPT-4o")).toBe("GPT-4o");
    });
  });

  describe("deriveTitle", () => {
    it("использует первую строку короткого текста как заголовок", () => {
      const content = "Это отличная модель для кодинга\nВторая строка с подробностями.";
      expect(deriveTitle(content)).toBe("Это отличная модель для кодинга");
    });

    it("обрезает заголовок длиннее 80 символов с многоточием по границе слова", () => {
      const longText =
        "Очень длинный текст публикации который явно превышает лимит восьмидесяти символов и должен быть аккуратно обрезан";
      const title = deriveTitle(longText);
      expect(title.length).toBeLessThanOrEqual(80);
      expect(title.endsWith("...")).toBe(true);
    });

    it("возвращает fallback при пустом тексте", () => {
      expect(deriveTitle("   ", "Без названия")).toBe("Без названия");
    });
  });

  describe("URL validation & normalization (Link Flow)", () => {
    it("валидирует корректные URL и домены", () => {
      expect(isValidUrl("https://github.com/vibe/hub")).toBe(true);
      expect(isValidUrl("http://localhost:3000")).toBe(false); // No dot in domain
      expect(isValidUrl("github.com/test")).toBe(true);
      expect(isValidUrl("https://anthropic.com")).toBe(true);
    });

    it("отклоняет некорректные строки", () => {
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("   ")).toBe(false);
      expect(isValidUrl("not a url")).toBe(false);
    });

    it("нормализует ссылки без протокола к https://", () => {
      expect(normalizeUrl("github.com/repo")).toBe("https://github.com/repo");
      expect(normalizeUrl("https://example.com")).toBe("https://example.com");
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("извлекает чистый домен из URL", () => {
      expect(extractDomain("https://www.anthropic.com/news/claude-3-7")).toBe("anthropic.com");
      expect(extractDomain("github.com/vibe/hub")).toBe("github.com");
    });

    it("форматирует ссылку для компактного превью", () => {
      expect(formatUrlPreview("https://github.com/awesome-project/repo")).toBe(
        "github.com/awesome-project/repo",
      );
    });

    it("корректно прикрепляет ссылку к состоянию и позволяет удалить её", () => {
      const initial = emptyComposerState();
      expect(initial.link).toBeUndefined();

      const withLink = { ...initial, link: normalizeUrl("github.com/vibe") };
      expect(withLink.link).toBe("https://github.com/vibe");

      const removedLink = { ...withLink, link: undefined };
      expect(removedLink.link).toBeUndefined();
    });

    it("коммитит валидный draft по Enter и возвращает нормализованный URL", () => {
      const state = emptyComposerState({ content: "Пост со ссылкой" });
      const result = commitPendingLink(state, "example.com/docs");

      expect(result.status).toBe("attached");
      if (result.status === "attached") {
        expect(result.state.link).toBe("https://example.com/docs");
        expect(result.state.content).toBe(state.content);
      }
    });

    it("коммитит валидный draft при submit без Enter", () => {
      const state = emptyComposerState({ content: "Пост со ссылкой" });
      const result = commitPendingLink(state, "https://example.com/submit");

      expect(result.status).toBe("attached");
      if (result.status === "attached") {
        expect(buildCreatePostInput(result.state).extras.url).toBe(
          "https://example.com/submit",
        );
      }
    });

    it("не теряет draft после смены категории перед submit", () => {
      const state = emptyComposerState({
        content: "Пост со ссылкой",
        category: "models",
      });
      const result = commitPendingLink(state, "https://example.com/category");

      expect(result.status).toBe("attached");
      if (result.status === "attached") {
        expect(result.state.category).toBe("models");
        expect(result.state.link).toBe("https://example.com/category");
      }
    });

    it("блокирует submit с невалидным URL и сохраняет текст", () => {
      const state = emptyComposerState({ content: "Текст не должен пропасть" });
      const result = commitPendingLink(state, "not a url");

      expect(result.status).toBe("invalid");
      expect(result.state).toEqual(state);
      expect(result.state.content).toBe("Текст не должен пропасть");
    });

    it("пустой draft означает намеренную отмену без изменения attached link", () => {
      const state = emptyComposerState({
        content: "Пост",
        link: "https://example.com/existing",
      });
      const result = commitPendingLink(state, "");

      expect(result.status).toBe("empty");
      expect(result.state).toEqual(state);
    });

    it("не теряет валидный draft при blur: повторный commit даёт ту же ссылку", () => {
      const state = emptyComposerState({ content: "Пост" });
      const afterBlur = { ...state, category: "tools" as const };
      const result = commitPendingLink(afterBlur, "https://example.com/blur");

      expect(result.status).toBe("attached");
      if (result.status === "attached") {
        expect(result.state.link).toBe("https://example.com/blur");
        expect(result.state.category).toBe("tools");
      }
    });

    it("читает и обновляет canonical URL extras при редактировании", () => {
      const existing = { url: "https://example.com/old", source: "manual" };
      expect(getPostLink(existing)).toBe("https://example.com/old");

      const replaced = updatePostLinkExtras(existing, "discussion", "example.com/new");
      expect(replaced).toEqual({
        source: "manual",
        url: "https://example.com/new",
      });

      const removed = updatePostLinkExtras(replaced, "discussion");
      expect(removed).toEqual({ source: "manual" });
    });

    it("использует repositoryUrl только для project и удаляет альтернативный ключ", () => {
      const extras = { url: "https://example.com/old", license: "MIT" };
      const updated = updatePostLinkExtras(extras, "project", "github.com/vibe/hub");

      expect(updated).toEqual({
        license: "MIT",
        repositoryUrl: "https://github.com/vibe/hub",
      });
      expect(getPostLink(updated)).toBe("https://github.com/vibe/hub");
    });
  });

  describe("contentEditableUtils (Atomic inline mention nodes & DOM serialization)", () => {
    it("создает inline mention anchor без имени провайдера в видимом лейбле", () => {
      const doc = createMockDoc();
      const entity: EntityRef = {
        kind: "model",
        id: "anthropic/claude-opus-4-1",
        name: "Claude Opus 4.1",
      };

      const anchor = createMentionElement(entity, "custom-class", doc);

      expect(anchor.tagName).toBe("A");
      expect(anchor.getAttribute("data-entity-type")).toBe("model");
      expect(anchor.getAttribute("data-entity-id")).toBe("anthropic/claude-opus-4-1");
      expect(anchor.getAttribute("data-entity-name")).toBe("Claude Opus 4.1");
      expect(anchor.getAttribute("contenteditable")).toBe("false");
      expect(anchor.getAttribute("target")).toBe("_blank");
      expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
      expect(anchor.getAttribute("href")).toBe("/models/anthropic/claude-opus-4-1");

      // Visible text must strictly be @Claude Opus 4.1, NOT @Anthropic · Claude...
      expect(anchor.textContent).toBe("@Claude Opus 4.1");
      expect(anchor.textContent).not.toContain("Anthropic");
    });

    it("сериализует DOM дерево contenteditable в plain text и структурированные entities", () => {
      const doc = createMockDoc();
      const container = doc.createElement("div");
      container.appendChild(doc.createTextNode("Тестировал "));

      const modelEntity: EntityRef = {
        kind: "model",
        id: "anthropic/claude-opus-4-1",
        name: "Claude Opus 4.1",
      };
      container.appendChild(createMentionElement(modelEntity, undefined, doc));
      container.appendChild(doc.createTextNode(" и "));

      const toolEntity: EntityRef = {
        kind: "tool",
        id: "cursor",
        name: "Cursor",
      };
      container.appendChild(createMentionElement(toolEntity, undefined, doc));

      const { text, entities } = serializeEditorToTextAndEntities(container);

      expect(text).toBe("Тестировал @Claude Opus 4.1 и @Cursor");
      expect(entities).toHaveLength(2);
      expect(entities[0].id).toBe("anthropic/claude-opus-4-1");
      expect(entities[1].id).toBe("cursor");
    });

    it("дедуплицирует повторно упомянутые модели при сериализации", () => {
      const doc = createMockDoc();
      const container = doc.createElement("div");
      const modelEntity: EntityRef = {
        kind: "model",
        id: "openai/gpt-4o",
        name: "GPT-4o",
      };
      container.appendChild(doc.createTextNode("Сравнил "));
      container.appendChild(createMentionElement(modelEntity, undefined, doc));
      container.appendChild(doc.createTextNode(" и снова "));
      container.appendChild(createMentionElement(modelEntity, undefined, doc));

      const { text, entities } = serializeEditorToTextAndEntities(container);

      expect(text).toBe("Сравнил @GPT-4o и снова @GPT-4o");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe("openai/gpt-4o");
    });
  });

  describe("insertMention pure helper (Mention insertion & cursor positioning)", () => {
    it("заменяет @query в начале текста и ставит курсор сразу после mention", () => {
      const { nextText, nextCursorPosition } = insertMention({
        text: "@cl",
        mentionStart: 0,
        mentionEnd: 3,
        label: "Claude Opus 4.1",
        addTrailingSpace: true,
      });

      expect(nextText).toBe("@Claude Opus 4.1 ");
      expect(nextCursorPosition).toBe("@Claude Opus 4.1 ".length);
    });

    it("заменяет @query в середине текста, сохраняя префикс и суффикс", () => {
      const text = "Сравнил @cla с @gpt";
      const mentionStart = 8;
      const mentionEnd = 12; // after "@cla"
      const { nextText, nextCursorPosition } = insertMention({
        text,
        mentionStart,
        mentionEnd,
        label: "Claude Opus 4.1",
        addTrailingSpace: true,
      });

      expect(nextText).toBe("Сравнил @Claude Opus 4.1 с @gpt");
      expect(nextCursorPosition).toBe("Сравнил @Claude Opus 4.1 ".length);
    });

    it("заменяет @query с суффиксом без лишних дублирующихся пробелов", () => {
      const text = "@cla и потом текст";
      const { nextText, nextCursorPosition } = insertMention({
        text,
        mentionStart: 0,
        mentionEnd: 4,
        label: "Claude Opus 4.1",
        addTrailingSpace: true,
      });

      expect(nextText).toBe("@Claude Opus 4.1 и потом текст");
      expect(nextCursorPosition).toBe("@Claude Opus 4.1 ".length);
    });
  });

  describe("@mention query parser & autocomplete flow", () => {
    it("открывает picker при вводе @ в начале или после пробела", () => {
      const q1 = atQuery("@", 1);
      expect(q1).toEqual({ start: 0, query: "" });

      const q2 = atQuery("Привет @", 8);
      expect(q2).toEqual({ start: 7, query: "" });
    });

    it("фильтрует query по мере ввода символов", () => {
      const q = atQuery("Привет @claude", 14);
      expect(q).toEqual({ start: 7, query: "claude" });
    });

    it("не открывает picker внутри email-адресов", () => {
      const q = atQuery("user@example.com", 16);
      expect(q).toBeNull();
    });

    it("закрывает picker после пробела в конце завершенного mention", () => {
      const q = atQuery("Привет @Claude 3.7 Sonnet ", 26);
      expect(q).toBeNull();
    });

    it("закрывает picker при переносе строки", () => {
      const q = atQuery("@claude\nновое предложение", 15);
      expect(q).toBeNull();
    });

    it("поддерживает повторный вызов @ для второго mention в том же тексте", () => {
      const text = "Сравнил @Claude 3.7 Sonnet и @";
      const q = atQuery(text, text.length);
      expect(q).toEqual({ start: 29, query: "" });
    });
  });

  describe("Entity deduplication & Parsing resolution", () => {
    const mockEntities: EntityRef[] = [
      { kind: "model", id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet" },
      { kind: "model", id: "claude-opus-4-1", name: "Claude Opus 4.1" },
      { kind: "model", id: "gpt-4o", name: "GPT-4o" },
      { kind: "model", id: "openai/gpt-5.6-luna", name: "GPT 5.6 Luna" },
      { kind: "tool", id: "cursor", name: "Cursor" },
    ];

    // Generate large dictionary of 400+ models to test regression against catalog pollution
    const large400EntityDictionary: EntityRef[] = [
      ...Array.from({ length: 420 }, (_, i): EntityRef => ({
        kind: "model",
        id: `provider/model-${i}`,
        name: `Model ${i} Pro Max`,
      })),
      { kind: "model", id: "openai/gpt-5.6-luna", name: "GPT 5.6 Luna" },
      { kind: "model", id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet" },
      { kind: "tool", id: "cursor", name: "Cursor" },
    ];

    it("regression 1: plain post + 400 entity dictionary => [] (never dumps dictionary)", () => {
      const plainText = "Всем привет! Это обычный пост без каких-либо упоминаний.";
      const resolved = resolveEntitiesFromContent(plainText, large400EntityDictionary);
      expect(resolved).toEqual([]);
      expect(resolved).toHaveLength(0);
    });

    it("regression 2: one mention => exactly 1 related entity", () => {
      const text = "Протестировал новую модель @GPT 5.6 Luna в реальном проекте.";
      const resolved = resolveEntitiesFromContent(text, large400EntityDictionary);
      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toEqual({
        kind: "model",
        id: "openai/gpt-5.6-luna",
        name: "GPT 5.6 Luna",
      });
    });

    it("regression 3: two mentions => exactly 2 related entities", () => {
      const text = "Сравнил @GPT 5.6 Luna и @Claude 3.7 Sonnet на бенчмарках.";
      const resolved = resolveEntitiesFromContent(text, large400EntityDictionary);
      expect(resolved).toHaveLength(2);
      expect(resolved.map((e) => e.id)).toEqual([
        "openai/gpt-5.6-luna",
        "anthropic/claude-3.7-sonnet",
      ]);
    });

    it("regression 4: duplicate mention of same model => one deduplicated entity record", () => {
      const text = "Сначала попробовал @GPT 5.6 Luna, потом снова запустил @GPT 5.6 Luna с другими параметрами.";
      const resolved = resolveEntitiesFromContent(text, large400EntityDictionary);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].id).toBe("openai/gpt-5.6-luna");
    });

    it("regression 5: edit removes mention => entity removed (stale metadata eliminated)", () => {
      const originalText = "Обзор возможностей @GPT 5.6 Luna";
      const initialResolved = resolveEntitiesFromContent(originalText, large400EntityDictionary);
      expect(initialResolved).toHaveLength(1);
      expect(initialResolved[0].id).toBe("openai/gpt-5.6-luna");

      // User edits the post removing the mention
      const editedText = "Обзор возможностей новой языковой модели";
      const updatedResolved = resolveEntitiesFromContent(editedText, large400EntityDictionary);
      expect(updatedResolved).toHaveLength(0);
      expect(updatedResolved).toEqual([]);
    });

    it("regression 6: plain model name without @ => no relation created", () => {
      const text = "Я использую GPT 5.6 Luna и Claude 3.7 Sonnet каждый день.";
      const resolved = resolveEntitiesFromContent(text, large400EntityDictionary);
      expect(resolved).toEqual([]);
      expect(resolved).toHaveLength(0);
    });

    it("дедуплицирует сущности с одинаковым kind и id", () => {
      const list: EntityRef[] = [
        { kind: "model", id: "gpt-4o", name: "GPT-4o" },
        { kind: "model", id: "gpt-4o", name: "GPT-4o" },
        { kind: "tool", id: "cursor", name: "Cursor" },
      ];

      const deduped = deduplicateEntities(list);
      expect(deduped).toHaveLength(2);
      expect(deduped.map((e) => e.id)).toEqual(["gpt-4o", "cursor"]);
    });

    it("распознает упоминания нескольких разных сущностей из текста", () => {
      const text = "Пробую @Claude 3.7 Sonnet в связке с @GPT-4o и @Cursor";
      const existing: EntityRef[] = [];

      const resolved = resolveEntitiesFromContent(text, mockEntities, existing);
      expect(resolved).toHaveLength(3);
      expect(resolved.map((e) => e.name)).toEqual([
        "Claude 3.7 Sonnet",
        "GPT-4o",
        "Cursor",
      ]);
    });

    it("не создает дубликаты structured entity если одна модель упомянута дважды в тексте", () => {
      const text = "Сначала тестировал @GPT-4o, затем снова @GPT-4o";
      const existing: EntityRef[] = [];

      const resolved = resolveEntitiesFromContent(text, mockEntities, existing);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].id).toBe("gpt-4o");
    });

    it("удаление mention из текста полностью очищает stale entity metadata", () => {
      const initialText = "Тестировал @Claude 3.7 Sonnet";
      const resolved1 = resolveEntitiesFromContent(initialText, mockEntities);
      expect(resolved1).toHaveLength(1);
      expect(resolved1[0].id).toBe("claude-3-7-sonnet");

      // User deletes mention from text
      const updatedText = "Тестировал новую модель";
      const resolved2 = resolveEntitiesFromContent(updatedText, mockEntities);
      expect(resolved2).toHaveLength(0);
    });

    it("не добавляет сущности при опечатках или отсутствии @", () => {
      const text = "Обычный текст без упоминаний и с фейковым @UnknownModel";
      const existing: EntityRef[] = [];

      const resolved = resolveEntitiesFromContent(text, mockEntities, existing);
      expect(resolved).toHaveLength(0);
    });

    it("фильтрует список кандидатов по тексту поиска", () => {
      const filtered = filterEntities("cursor", mockEntities);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("cursor");
    });

    it("компонентный end-to-end тест: ввод @cl -> выбор Claude -> замена текста и привязка сущности", () => {
      const initialText = "Тестировал @cl";
      const caret = 14;
      const query = atQuery(initialText, caret);
      expect(query).toEqual({ start: 11, query: "cl" });

      const filtered = filterEntities(query!.query, mockEntities);
      const selected = filtered.find((m) => m.id === "claude-opus-4-1")!;
      expect(selected).toBeDefined();

      const { nextText, nextCursorPosition } = insertMention({
        text: initialText,
        mentionStart: query!.start,
        mentionEnd: caret,
        label: selected.name,
      });

      expect(nextText).toBe("Тестировал @Claude Opus 4.1 ");
      expect(nextCursorPosition).toBe("Тестировал @Claude Opus 4.1 ".length);

      const resolvedEntities = resolveEntitiesFromContent(nextText, mockEntities);
      expect(resolvedEntities).toHaveLength(1);
      expect(resolvedEntities[0].id).toBe("claude-opus-4-1");
    });
  });

  describe("Canonical Entity Routes", () => {
    it("строит канонический маршрут для модели", () => {
      expect(entityPath({ kind: "model", id: "claude-3-7-sonnet" })).toBe(
        "/models/claude-3-7-sonnet",
      );
    });

    it("строит канонический маршрут для инструмента", () => {
      expect(entityPath({ kind: "tool", id: "cursor" })).toBe("/tools/cursor");
    });
  });

  describe("emptyComposerState & overrides", () => {
    it("создает дефолтное состояние с типом discussion", () => {
      const state = emptyComposerState();
      expect(state.content).toBe("");
      expect(state.type).toBe("discussion");
      expect(state.category).toBeUndefined();
      expect(state.link).toBeUndefined();
      expect(state.entities).toEqual([]);
    });

    it("применяет начальные overrides (pre-attached entity, type, etc.)", () => {
      const entity: EntityRef = { kind: "model", id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet" };
      const state = emptyComposerState({
        content: "@Claude 3.7 Sonnet ",
        type: "question",
        category: "models",
        entities: [entity],
        link: "https://anthropic.com",
      });

      expect(state.content).toBe("@Claude 3.7 Sonnet ");
      expect(state.type).toBe("question");
      expect(state.category).toBe("models");
      expect(state.entities).toEqual([entity]);
      expect(state.link).toBe("https://anthropic.com");
    });
  });

  describe("isComposerDirty & Discard Confirmation logic", () => {
    it("пустой composer не является dirty и закрывается без подтверждения", () => {
      const baseline = emptyComposerState();
      const current = emptyComposerState();
      expect(isComposerDirty(current, baseline)).toBe(false);
    });

    it("возвращает true при изменении текста", () => {
      const baseline = emptyComposerState();
      const current = { ...baseline, content: "Новая мысль" };
      expect(isComposerDirty(current, baseline)).toBe(true);
    });

    it("возвращает true при смене типа или категории", () => {
      const baseline = emptyComposerState();
      const current1 = { ...baseline, type: "question" as const };
      const current2 = { ...baseline, category: "mcp" as const };

      expect(isComposerDirty(current1, baseline)).toBe(true);
      expect(isComposerDirty(current2, baseline)).toBe(true);
    });

    it("возвращает true при добавлении ссылки или сущности", () => {
      const baseline = emptyComposerState();
      const current1 = { ...baseline, link: "https://example.com" };
      const current2 = {
        ...baseline,
        entities: [{ kind: "tool" as const, id: "t1", name: "Cursor" }],
      };

      expect(isComposerDirty(current1, baseline)).toBe(true);
      expect(isComposerDirty(current2, baseline)).toBe(true);
    });

    it("сброс изменений возвращает dirty в false", () => {
      const baseline = emptyComposerState();
      let current = { ...baseline, content: "Черновик" };
      expect(isComposerDirty(current, baseline)).toBe(true);

      // User clears back to baseline
      current = { ...baseline, content: "" };
      expect(isComposerDirty(current, baseline)).toBe(false);
    });
  });

  describe("buildCreatePostInput (Backend mapping compatibility)", () => {
    it("создает валидный CreatePostInput для обычного обсуждения", () => {
      const state = emptyComposerState({
        content: "Мой первый пост в VibeHub!",
      });

      const input = buildCreatePostInput(state);
      expect(input).toEqual({
        type: "discussion",
        category: undefined,
        title: "Мой первый пост в VibeHub!",
        content: "Мой первый пост в VibeHub!",
        tags: [],
        extras: {},
      });
    });

    it("сохраняет выбранный тип и тему", () => {
      const state = emptyComposerState({
        content: "Как настроить MCP сервер?",
        type: "question",
        category: "mcp",
      });

      const input = buildCreatePostInput(state);
      expect(input.type).toBe("question");
      expect(input.category).toBe("mcp");
      expect(input.title).toBe("Как настроить MCP сервер?");
    });

    it("маппит ссылку в extras.repositoryUrl для проекта", () => {
      const state = emptyComposerState({
        content: "Опубликовал демо нового агента",
        type: "project",
        link: "github.com/user/agent-demo",
      });

      const input = buildCreatePostInput(state);
      expect(input.type).toBe("project");
      expect(input.extras.repositoryUrl).toBe("https://github.com/user/agent-demo");
    });

    it("маппит ссылку в extras.url для обычных постов и ресурсов", () => {
      const state = emptyComposerState({
        content: "Интересная статья про reasoning models",
        type: "resource",
        link: "https://arxiv.org/abs/1234.5678",
      });

      const input = buildCreatePostInput(state);
      expect(input.type).toBe("resource");
      expect(input.extras.url).toBe("https://arxiv.org/abs/1234.5678");
    });

    it("формирует заголовок с именем сущности при пустом тексте", () => {
      const entity: EntityRef = { kind: "model", id: "gpt-4", name: "GPT-4" };
      const state = emptyComposerState({
        content: "",
        entities: [entity],
      });

      const input = buildCreatePostInput(state);
      expect(input.title).toBe("Обсуждение: GPT-4");
    });
  });
});
