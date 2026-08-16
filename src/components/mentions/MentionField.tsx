import { useEffect, useRef, useState } from "react";
import { atQuery, filterEntities } from "../../services/entities";
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
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onSubmit?: () => void;
}) {
  const { mentionEntities } = useHub();
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const query = atQuery(value, caret);
  const suggestions = query
    ? filterEntities(query.query, mentionEntities).slice(0, 8)
    : [];

  useEffect(() => {
    setActive(0);
  }, [query?.query]);

  const insert = (entity: EntityRef) => {
    if (!query) return;
    const next = `${value.slice(0, query.start)}@${entity.name} ${value.slice(caret)}`;
    onChange(next);
    requestAnimationFrame(() => {
      const pos = query.start + entity.name.length + 2;
      area.current?.focus();
      area.current?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };

  return (
    <div style={{ position: "relative" }}>
      {query && suggestions.length > 0 ? (
        <MentionAutocomplete
          items={suggestions}
          active={active}
          onPick={insert}
        />
      ) : null}
      <textarea
        ref={area}
        className={className}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
        }}
        onClick={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart)}
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
        }}
      />
    </div>
  );
}
