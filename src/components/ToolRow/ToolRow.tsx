import { memo, type KeyboardEvent } from "react";
import { IconButton } from "../IconButton/IconButton";
import { IconBookmark } from "../icons";
import type { Tool } from "../../types/hub";
import styles from "./ToolRow.module.css";

export interface ToolRowProps {
  tool: Tool;
  bookmarked: boolean;
  onBookmark: () => void;
  onOpen: () => void;
}

export const ToolRow = memo(function ToolRow({
  tool,
  bookmarked,
  onBookmark,
  onOpen,
}: ToolRowProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={`Открыть инструмент ${tool.name}`}
    >
      <span className={styles.mark} aria-hidden>
        {tool.name.slice(0, 1)}
      </span>
      <div className={styles.body}>
        <h2>{tool.name}</h2>
        <p className={styles.summary}>{tool.summary}</p>
        <p className={styles.meta}>
          {tool.typeLabel}
          {tool.tags.map((tag) => (
            <span key={tag}> · {tag}</span>
          ))}
          {tool.compatibility.length > 0 ? (
            <span> · {tool.compatibility.join(" · ")}</span>
          ) : null}
        </p>
      </div>
      <div
        className={styles.actions}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <IconButton
          label={bookmarked ? "Убрать из закладок" : "Сохранить"}
          active={bookmarked}
          onClick={(e) => {
            e.stopPropagation();
            onBookmark();
          }}
        >
          <IconBookmark width={18} height={18} />
        </IconButton>
      </div>
    </article>
  );
});
