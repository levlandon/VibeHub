import { cleanModelName } from "../../services/entities";
import { entityPath, profilePath } from "../../state/routing";
import type { EntityRef } from "../../types/entities";

export interface DOMFactory {
  createElement: (tag: string) => HTMLElement;
}

/**
 * Creates an atomic inline mention anchor element for contenteditable DOM.
 */
export function createMentionElement(
  entity: EntityRef,
  className?: string,
  doc?: DOMFactory,
): HTMLAnchorElement {
  const d = doc || (typeof document !== "undefined" ? document : null);
  if (!d) {
    throw new Error("document is required to create mention element");
  }

  const cleanName = cleanModelName(entity.name);

  const el = d.createElement("a") as HTMLAnchorElement;
  el.setAttribute("data-entity-type", entity.kind);
  el.setAttribute("data-entity-id", entity.id);
  el.setAttribute("data-entity-name", cleanName);
  el.setAttribute("contenteditable", "false");
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener noreferrer");

  const href =
    entity.kind === "model" || entity.kind === "tool"
      ? entityPath({ kind: entity.kind, id: entity.id })
      : entity.kind === "user"
      ? profilePath(entity.id)
      : "#";

  el.setAttribute("href", href);
  el.setAttribute("aria-label", `${cleanName} — открыть модель`);
  if (className) {
    el.className = className;
  }
  // Strictly display label: human-readable name only (e.g. @Claude Opus 4.1)
  el.textContent = `@${cleanName}`;
  return el;
}

/**
 * Deduplicates an array of EntityRef by kind and ID.
 */
export function deduplicateEntities(entities: EntityRef[]): EntityRef[] {
  const seen = new Set<string>();
  const result: EntityRef[] = [];
  for (const entity of entities) {
    const key = `${entity.kind}:${entity.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entity);
    }
  }
  return result;
}

export interface MinimalDOMNode {
  nodeType: number;
  nodeValue?: string | null;
  textContent?: string | null;
  tagName?: string;
  getAttribute?: (name: string) => string | null;
  childNodes?: ArrayLike<MinimalDOMNode>;
}

/**
 * Serializes a contenteditable DOM tree into a plain text string and structured entities.
 */
export function serializeEditorToTextAndEntities(root: {
  childNodes: ArrayLike<MinimalDOMNode | Node>;
}): {
  text: string;
  entities: EntityRef[];
} {
  let text = "";
  const entities: EntityRef[] = [];

  function walk(node: MinimalDOMNode | Node | null | undefined) {
    if (!node) return;

    if (node.nodeType === 3) {
      // TEXT_NODE
      text += node.nodeValue ?? node.textContent ?? "";
      return;
    }

    if (node.nodeType === 1) {
      // ELEMENT_NODE
      const el = node as MinimalDOMNode & HTMLElement;

      // Check if element is a mention anchor
      const entityId = el.getAttribute?.("data-entity-id");
      const entityType = el.getAttribute?.("data-entity-type");
      const entityName = el.getAttribute?.("data-entity-name");

      if (entityId && entityType && entityName) {
        text += `@${entityName}`;
        entities.push({
          kind: entityType as EntityRef["kind"],
          id: entityId,
          name: entityName,
        });
        return;
      }

      const tagName = (el.tagName || "").toUpperCase();
      if (tagName === "BR") {
        text += "\n";
        return;
      }

      if (tagName === "DIV" || tagName === "P") {
        if (text.length > 0 && !text.endsWith("\n")) {
          text += "\n";
        }
      }

      const children = el.childNodes || [];
      for (let i = 0; i < children.length; i++) {
        walk(children[i]);
      }
    }
  }

  const rootChildren = root.childNodes || [];
  for (let i = 0; i < rootChildren.length; i++) {
    walk(rootChildren[i]);
  }

  return {
    text,
    entities: deduplicateEntities(entities),
  };
}

/**
 * Computes plain text before the current cursor inside the contenteditable root.
 */
export function getTextBeforeCaret(root: HTMLElement): {
  textBefore: string;
  caretOffset: number;
} {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return { textBefore: "", caretOffset: 0 };
  }

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return { textBefore: "", caretOffset: 0 };
  }

  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(root);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  const container = document.createElement("div");
  container.appendChild(preCaretRange.cloneContents());
  const { text } = serializeEditorToTextAndEntities(container);

  return {
    textBefore: text,
    caretOffset: text.length,
  };
}

/**
 * Replaces the active @query range in contenteditable DOM with an atomic mention element.
 */
export function insertMentionNodeAtCaret(
  root: HTMLElement,
  _mentionStart: number,
  entity: EntityRef,
  className?: string,
): { text: string; entities: EntityRef[] } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return serializeEditorToTextAndEntities(root);
  }

  // Find and replace text from mentionStart up to caret in the active text node
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;

  if (node.nodeType === 3) {
    // TEXT_NODE
    const textVal = node.nodeValue ?? "";
    const atIdx = textVal.lastIndexOf("@", offset);

    if (atIdx >= 0) {
      // Split node and insert mention
      const beforeText = textVal.slice(0, atIdx);
      const afterText = textVal.slice(offset);

      const mentionEl = createMentionElement(entity, className);
      const spaceNode = document.createTextNode(" " + afterText);

      node.nodeValue = beforeText;
      const parent = node.parentNode;
      if (parent) {
        parent.insertBefore(mentionEl, node.nextSibling);
        parent.insertBefore(spaceNode, mentionEl.nextSibling);

        // Move caret right after the space
        const newRange = document.createRange();
        newRange.setStart(spaceNode, 1);
        newRange.setEnd(spaceNode, 1);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
  } else {
    // Fallback: append or insert mention element at range
    const mentionEl = createMentionElement(entity, className);
    const spaceNode = document.createTextNode(" ");
    range.deleteContents();
    range.insertNode(spaceNode);
    range.insertNode(mentionEl);

    const newRange = document.createRange();
    newRange.setStart(spaceNode, 1);
    newRange.setEnd(spaceNode, 1);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  return serializeEditorToTextAndEntities(root);
}
