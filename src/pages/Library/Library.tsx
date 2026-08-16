import { useMemo, useState } from "react";
import { CategoryStrip } from "../../components/CategoryStrip/CategoryStrip";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ModelRow } from "../../components/ModelRow";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ToolRow } from "../../components/ToolRow";
import { Select } from "../../components/ui/Select";
import { filterAndSortModels } from "../../services/models";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { Model, Tool } from "../../types/hub";
import type { ModelSort } from "../../types/models";
import styles from "./Library.module.css";

type TabId = "all" | "model" | "tool";

const CAPABILITY_OPTIONS = [
  { value: "vision", label: "Vision" },
  { value: "reasoning", label: "Reasoning" },
  { value: "tools", label: "Tools" },
  { value: "audio", label: "Audio" },
  { value: "free", label: "Бесплатные" },
];

const SORT_OPTIONS: { value: ModelSort; label: string }[] = [
  { value: "catalog", label: "Каталог" },
  { value: "new", label: "Новые" },
  { value: "context-desc", label: "Контекст: больше" },
  { value: "context-asc", label: "Контекст: меньше" },
  { value: "price-asc", label: "Цена: дешевле" },
  { value: "name", label: "Название (A–Z)" },
];

export function BookmarksPage() {
  const {
    savedItems,
    models,
    tools,
    toggleModelBookmark,
    toggleToolBookmark,
    openEntity,
  } = useHub();

  const [activeTab, setActiveTab] = useState<TabId>("all");

  // Model filter states
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [provider, setProvider] = useState("all");
  const [sort, setSort] = useState<ModelSort>("catalog");

  // Resolve saved models preserving saved order
  const savedModels = useMemo(() => {
    const modelById = new Map(models.map((m) => [m.id, m]));
    return savedItems
      .filter((item) => item.kind === "model")
      .map((item) => modelById.get(item.targetId))
      .filter((m): m is Model => Boolean(m));
  }, [savedItems, models]);

  // Resolve saved tools preserving saved order
  const savedTools = useMemo(() => {
    const toolById = new Map(tools.map((t) => [t.id, t]));
    return savedItems
      .filter((item) => item.kind === "tool")
      .map((item) => toolById.get(item.targetId))
      .filter((t): t is Tool => Boolean(t));
  }, [savedItems, tools]);

  // Categories with live counts
  const categories = useMemo(
    () => [
      { id: "all" as const, label: `Все (${savedItems.length})` },
      { id: "model" as const, label: `Модели (${savedModels.length})` },
      { id: "tool" as const, label: `Инструменты (${savedTools.length})` },
    ],
    [savedItems.length, savedModels.length, savedTools.length],
  );

  // Dynamic providers computed solely from saved models
  const savedProviders = useMemo(
    () => [...new Set(savedModels.map((m) => m.provider))].sort((a, b) => a.localeCompare(b)),
    [savedModels],
  );

  const providerOptions = useMemo(() => {
    const allOpt = { value: "all", label: `Все (${savedProviders.length})` };
    return [allOpt, ...savedProviders.map((p) => ({ value: p, label: p }))];
  }, [savedProviders]);

  // Filtered saved models
  const filteredSavedModels = useMemo(
    () =>
      filterAndSortModels(savedModels, {
        capabilities,
        provider,
        sort,
      }),
    [savedModels, capabilities, provider, sort],
  );

  const hasActiveModelFilters = capabilities.length > 0 || provider !== "all";

  return (
    <div className={styles.page}>
      <PageHeader title="Закладки">
        <CategoryStrip
          items={categories}
          value={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />
        {activeTab === "model" && savedModels.length > 0 ? (
          <div className={styles.toolbar}>
            <Select
              label="Provider"
              value={provider}
              options={providerOptions}
              onChange={setProvider}
              searchable={savedProviders.length > 5}
              searchPlaceholder="Поиск провайдера..."
            />
            <Select
              label="Возможности"
              multiple
              value={capabilities}
              options={CAPABILITY_OPTIONS}
              onChange={setCapabilities}
              placeholder="Все"
            />
            <Select
              label="Сортировка"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(val) => setSort(val as ModelSort)}
            />
          </div>
        ) : null}
      </PageHeader>

      {savedItems.length === 0 ? (
        <EmptyState>
          <p>Здесь появятся сохранённые модели и инструменты.</p>
        </EmptyState>
      ) : activeTab === "all" ? (
        <>
          {savedModels.length > 0 ? (
            <section aria-label="Сохранённые модели">
              {savedTools.length > 0 ? (
                <h3 className={styles.groupTitle}>Модели</h3>
              ) : null}
              <ul className={styles.list}>
                {savedModels.map((model) => (
                  <li key={model.id} id={`saved-model-${model.id.replace(/\//g, "-")}`}>
                    <ModelRow
                      model={model}
                      bookmarked={isSaved(savedItems, "model", model.id)}
                      onBookmark={() => toggleModelBookmark(model.id)}
                      onOpen={() => openEntity("model", model.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {savedTools.length > 0 ? (
            <section aria-label="Сохранённые инструменты">
              {savedModels.length > 0 ? (
                <h3 className={styles.groupTitle}>Инструменты</h3>
              ) : null}
              <ul className={styles.list}>
                {savedTools.map((tool) => (
                  <li key={tool.id} id={`saved-tool-${tool.id}`}>
                    <ToolRow
                      tool={tool}
                      bookmarked={isSaved(savedItems, "tool", tool.id)}
                      onBookmark={() => toggleToolBookmark(tool.id)}
                      onOpen={() => openEntity("tool", tool.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : activeTab === "model" ? (
        savedModels.length === 0 ? (
          <EmptyState>
            <p>Сохранённых моделей пока нет.</p>
          </EmptyState>
        ) : filteredSavedModels.length === 0 ? (
          <EmptyState>
            <p>Среди сохранённых моделей ничего не найдено.</p>
            {hasActiveModelFilters ? (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => {
                  setCapabilities([]);
                  setProvider("all");
                }}
              >
                Сбросить фильтры
              </button>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <div className={styles.countInfo}>
              Показано моделей: {filteredSavedModels.length}
              {filteredSavedModels.length !== savedModels.length ? ` из ${savedModels.length}` : ""}
            </div>
            <ul className={styles.list}>
              {filteredSavedModels.map((model) => (
                <li key={model.id} id={`saved-model-${model.id.replace(/\//g, "-")}`}>
                  <ModelRow
                    model={model}
                    bookmarked={isSaved(savedItems, "model", model.id)}
                    onBookmark={() => toggleModelBookmark(model.id)}
                    onOpen={() => openEntity("model", model.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )
      ) : activeTab === "tool" ? (
        savedTools.length === 0 ? (
          <EmptyState>
            <p>Сохранённых инструментов пока нет.</p>
          </EmptyState>
        ) : (
          <ul className={styles.list}>
            {savedTools.map((tool) => (
              <li key={tool.id} id={`saved-tool-${tool.id}`}>
                <ToolRow
                  tool={tool}
                  bookmarked={isSaved(savedItems, "tool", tool.id)}
                  onBookmark={() => toggleToolBookmark(tool.id)}
                  onOpen={() => openEntity("tool", tool.id)}
                />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

export { CollectionsPage } from "./CollectionsPage";
