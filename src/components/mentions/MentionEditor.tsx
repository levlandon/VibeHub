import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { atQuery, filterEntities } from "../../services/entities";
import { useHub } from "../../state/HubContext";
import type { EntityRef } from "../../types/entities";
import {
  createMentionElement,
  getTextBeforeCaret,
  insertMentionNodeAtCaret,
  serializeEditorToTextAndEntities,
} from "./contentEditableUtils";
import { MentionAutocomplete } from "./MentionAutocomplete";
import styles from "./MentionEditor.module.css";

export interface MentionEditorProps {
  value: string;
  onChange: (text: string, entities: EntityRef[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function MentionEditor({
  value,
  onChange,
  placeholder = "Что хотите обсудить? Напишите мысль или упомяните @модель...",
  autoFocus = true,
  onSubmit,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Текст публикации",
}: MentionEditorProps) {
  const { mentionEntities } = useHub();
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);

  const [activeQuery, setActiveQuery] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const [activeCandidateIdx, setActiveCandidateIdx] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const suggestions =
    activeQuery && !isDismissed
      ? filterEntities(activeQuery.query, mentionEntities).slice(0, 8)
      : [];

  const updateEditorState = useCallback(() => {
    if (!editorRef.current) return;
    const { text, entities } = serializeEditorToTextAndEntities(
      editorRef.current,
    );
    isInternalChangeRef.current = true;
    onChange(text, entities);

    // Compute caret position and active mention query
    const { textBefore } = getTextBeforeCaret(editorRef.current);
    const query = atQuery(textBefore, textBefore.length);
    setActiveQuery(query);
    setActiveCandidateIdx(0);
    setIsDismissed(false);
  }, [onChange]);

  // Initial population or external value change
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    // Populate DOM if text doesn't match
    const currentSerialized = serializeEditorToTextAndEntities(
      editorRef.current,
    );
    if (currentSerialized.text === value) return;

    editorRef.current.innerHTML = "";
    if (!value) return;

    // Parse existing text for mention spans to restore DOM
    // Match tokens starting with @ matching known entities
    let remaining = value;
    const fragment = document.createDocumentFragment();

    while (remaining.length > 0) {
      const atIdx = remaining.indexOf("@");
      if (atIdx < 0) {
        fragment.appendChild(document.createTextNode(remaining));
        break;
      }

      if (atIdx > 0) {
        fragment.appendChild(
          document.createTextNode(remaining.slice(0, atIdx)),
        );
        remaining = remaining.slice(atIdx);
      }

      // Check if remainder matches an entity name
      let matchedEntity: EntityRef | null = null;
      for (const ent of mentionEntities) {
        if (
          remaining.startsWith(`@${ent.name} `) ||
          remaining === `@${ent.name}`
        ) {
          matchedEntity = ent;
          break;
        }
      }

      if (matchedEntity) {
        const mentionEl = createMentionElement(
          matchedEntity,
          styles.inlineMention,
        );
        fragment.appendChild(mentionEl);
        const tokenLength = `@${matchedEntity.name}`.length;
        remaining = remaining.slice(tokenLength);
      } else {
        fragment.appendChild(document.createTextNode("@"));
        remaining = remaining.slice(1);
      }
    }

    editorRef.current.appendChild(fragment);
  }, [value, mentionEntities]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      const timer = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          // Move caret to end
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleSelectEntity = (entity: EntityRef) => {
    if (!editorRef.current || !activeQuery) return;

    const { text, entities } = insertMentionNodeAtCaret(
      editorRef.current,
      activeQuery.start,
      entity,
      styles.inlineMention,
    );

    setActiveQuery(null);
    setIsDismissed(false);
    isInternalChangeRef.current = true;
    onChange(text, entities);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+Enter / Cmd+Enter submits
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (onSubmit && !disabled) {
        onSubmit();
      }
      return;
    }

    // Mention popover keyboard navigation
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveCandidateIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveCandidateIdx(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const pick = suggestions[activeCandidateIdx];
        if (pick) {
          handleSelectEntity(pick);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsDismissed(true);
        return;
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const plainText = e.clipboardData.getData("text/plain");
    if (!plainText) return;

    // Insert sanitized plain text at current caret
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(plainText);
    range.insertNode(textNode);

    // Position caret after inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);

    updateEditorState();
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const mentionAnchor = target.closest("a[data-entity-id]") as HTMLAnchorElement | null;

    if (mentionAnchor) {
      e.preventDefault();
      e.stopPropagation();
      const href = mentionAnchor.getAttribute("href");
      if (href && href !== "#") {
        window.open(href, "_blank", "noopener,noreferrer");
      }
      return;
    }

    updateEditorState();
  };

  return (
    <div className={styles.editorWrap}>
      {suggestions.length > 0 ? (
        <MentionAutocomplete
          items={suggestions}
          active={activeCandidateIdx}
          onPick={handleSelectEntity}
        />
      ) : null}

      <div
        ref={editorRef}
        className={`${styles.editor} ${className ?? ""}`}
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={updateEditorState}
        onKeyUp={updateEditorState}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleClick}
        suppressContentEditableWarning={true}
      />
    </div>
  );
}
