import { useEffect, useRef, useState } from "react";
import { atQuery, filterEntities, insertMention } from "../../services/entities";
import { useHub } from "../../state/HubContext";
import type { EntityRef } from "../../types/entities";
import { MentionAutocomplete } from "./MentionAutocomplete";

export function MentionField({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  onSubmit,
  onMentionPick,
  autoFocus = false,
  submitOnMetaEnter = false,
  autoResize = false,
  maxHeight = 260,
  minHeight,
  "aria-label": ariaLabel,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onSubmit?: () => void;
  onMentionPick?: (entity: EntityRef) => void;
  autoFocus?: boolean;
  submitOnMetaEnter?: boolean;
  autoResize?: boolean;
  maxHeight?: number;
  minHeight?: number;
  "aria-label"?: string;
  id?: string;
}) {
  const { mentionEntities } = useHub();
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const query = atQuery(value, caret);

  const isDismissed = query !== null && dismissedStart === query.start;
  const suggestions =
    query && !isDismissed
      ? filterEntities(query.query, mentionEntities).slice(0, 8)
      : [];

  useEffect(() => {
    setActive(0);
    // If query starts at a new position, reset dismissal
    if (query && dismissedStart !== null && query.start !== dismissedStart) {
      setDismissedStart(null);
    }
  }, [query, dismissedStart]);

  useEffect(() => {
    if (autoFocus && area.current) {
      // Defer focus slightly to ensure modal is mounted
      const timer = setTimeout(() => {
        area.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Handle auto-resize
  useEffect(() => {
    if (!autoResize || !area.current) return;
    const el = area.current;
    el.style.height = "auto";
    const nextHeight = Math.min(
      Math.max(el.scrollHeight, minHeight ?? 0),
      maxHeight,
    );
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, autoResize, maxHeight, minHeight]);

  const insert = (entity: EntityRef) => {
    if (!query) return;

    const { nextText, nextCursorPosition } = insertMention({
      text: value,
      mentionStart: query.start,
      mentionEnd: caret,
      label: entity.name,
      addTrailingSpace: true,
    });

    setDismissedStart(null);
    setCaret(nextCursorPosition);
    onChange(nextText);
    onMentionPick?.(entity);

    requestAnimationFrame(() => {
      if (area.current) {
        area.current.focus();
        area.current.setSelectionRange(nextCursorPosition, nextCursorPosition);
      }
    });
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {query && suggestions.length > 0 ? (
        <MentionAutocomplete
          items={suggestions}
          active={active}
          onPick={insert}
        />
      ) : null}
      <textarea
        ref={area}
        id={id}
        aria-label={ariaLabel}
        className={className}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
          setDismissedStart(null);
        }}
        onClick={(e) => {
          setCaret(e.currentTarget.selectionStart);
          setDismissedStart(null);
        }}
        onKeyUp={(e) => {
          setCaret(e.currentTarget.selectionStart);
        }}
        onKeyDown={(e) => {
          if (suggestions.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setActive((i) =>
              e.key === "ArrowDown"
                ? (i + 1) % suggestions.length
                : (i - 1 + suggestions.length) % suggestions.length,
            );
            return;
          }

          if (suggestions.length && e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setDismissedStart(query?.start ?? 0);
            return;
          }

          if (submitOnMetaEnter) {
            // In composer mode: Ctrl+Enter / Cmd+Enter submits
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (onSubmit) {
                onSubmit();
              }
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              if (suggestions.length) {
                e.preventDefault();
                const pick = suggestions[active];
                if (pick) insert(pick);
                return;
              }
              // Normal Enter allows new line in composer
            }
          } else {
            // Chat mode: plain Enter submits, Shift+Enter newlines
            if (e.key === "Enter" && !e.shiftKey) {
              if (suggestions.length) {
                e.preventDefault();
                const pick = suggestions[active];
                if (pick) insert(pick);
                return;
              }
              if (onSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }
          }
        }}
      />
    </div>
  );
}
