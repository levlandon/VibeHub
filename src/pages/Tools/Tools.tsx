import { useState, type KeyboardEvent } from "react";
import { Button } from "../../components/Button/Button";
import { CategoryStrip } from "../../components/CategoryStrip/CategoryStrip";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark } from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { Tool, ToolCategory, ToolType } from "../../types/hub";
import styles from "./Tools.module.css";

const CATEGORIES: { id: "all" | ToolCategory; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "coding", label: "Coding" },
  { id: "agents", label: "Agents" },
  { id: "research", label: "Research" },
  { id: "design", label: "Design" },
  { id: "local-ai", label: "Local AI" },
];

const TYPES: { id: "all" | ToolType; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "skill", label: "Skill" },
  { id: "mcp", label: "MCP" },
  { id: "plugin", label: "Plugin" },
  { id: "cli", label: "CLI" },
  { id: "ide", label: "IDE extension" },
];

export function ToolsPage() {
  const { tools, savedItems, toggleToolBookmark, openEntity, setAddOpen } = useHub();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("all");

  const visible = tools.filter((tool) => {
    const byCat = category === "all" || tool.category === category;
    const byType = type === "all" || tool.type === type;
    return byCat && byType;
  });

  return (
    <div className={styles.page}>
      <PageHeader title="Инструменты">
        <CategoryStrip
          items={CATEGORIES}
          value={category}
          onChange={(id) => setCategory(id as typeof category)}
        />
        <div className={styles.secondary}>
          <label className={styles.type}>
            Тип
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              {TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>

      {tools.length === 0 ? (
        <EmptyState>
          <div className={styles.emptyContent}>
            <h3>Инструментов пока нет</h3>
            <p>Каталог будет наполняться сообществом.</p>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              + Предложить инструмент
            </Button>
          </div>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState>Инструменты не найдены по выбранным фильтрам.</EmptyState>
      ) : (
        <ul className={styles.list}>
          {visible.map((tool) => (
            <li key={tool.id} id={`tool-${tool.id}`}>
              <ToolRow
                tool={tool}
                bookmarked={isSaved(savedItems, "tool", tool.id)}
                onBookmark={() => toggleToolBookmark(tool.id)}
                onOpen={() => openEntity("tool", tool.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ToolRow({
  tool,
  bookmarked,
  onBookmark,
  onOpen,
}: {
  tool: Tool;
  bookmarked: boolean;
  onBookmark: () => void;
  onOpen: () => void;
}) {
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
}
