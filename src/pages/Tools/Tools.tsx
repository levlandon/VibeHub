import { useState } from "react";
import { Button } from "../../components/Button/Button";
import { CategoryStrip } from "../../components/CategoryStrip/CategoryStrip";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ToolRow } from "../../components/ToolRow";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { ToolCategory, ToolType } from "../../types/hub";
import styles from "./Tools.module.css";
import { useI18n } from "../../i18n";

const CATEGORIES: { id: "all" | ToolCategory; key: string }[] = [
  { id: "all", key: "feed.all" },
  { id: "coding", key: "tools.category.coding" },
  { id: "agents", key: "tools.category.agents" },
  { id: "research", key: "tools.category.research" },
  { id: "design", key: "tools.category.design" },
  { id: "local-ai", key: "tools.category.localAi" },
];

const TYPES: { id: "all" | ToolType; key: string }[] = [
  { id: "all", key: "feed.all" },
  { id: "skill", key: "tools.type.skill" },
  { id: "mcp", key: "tools.type.mcp" },
  { id: "plugin", key: "tools.type.plugin" },
  { id: "cli", key: "tools.type.cli" },
  { id: "ide", key: "tools.type.ide" },
];

export function ToolsPage() {
  const { t } = useI18n();
  const { tools, savedItems, toggleToolBookmark, openEntity, setAddOpen } = useHub();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("all");

  const categories = CATEGORIES.map((item) => ({ ...item, label: t(item.key) }));
  const types = TYPES.map((item) => ({ ...item, label: t(item.key) }));

  const visible = tools.filter((tool) => {
    const byCat = category === "all" || tool.category === category;
    const byType = type === "all" || tool.type === type;
    return byCat && byType;
  });

  return (
    <div className={styles.page}>
      <PageHeader title={t("feed.tools")}>
        <CategoryStrip
          items={categories}
          value={category}
          onChange={(id) => setCategory(id as typeof category)}
        />
        <div className={styles.secondary}>
          <label className={styles.type}>
            {t("tools.type")}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              {types.map((item) => (
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
            <h3>{t("tools.emptyTitle")}</h3>
            <p>{t("tools.emptyDescription")}</p>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              + {t("tools.suggest")}
            </Button>
          </div>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState>{t("tools.filteredEmpty")}</EmptyState>
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
