import { useMemo, useState } from "react";
import { CategoryStrip } from "../../components/CategoryStrip/CategoryStrip";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ModelRow } from "../../components/ModelRow";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { RepositoryRow } from "../../components/RepositoryRow";
import { ToolRow } from "../../components/ToolRow";
import { Select } from "../../components/ui/Select";
import { filterAndSortModels } from "../../services/models";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { Model, Tool } from "../../types/hub";
import type { ModelSort } from "../../types/models";
import styles from "./Library.module.css";

type TabId = "all" | "model" | "tool" | "repository";

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

interface BookmarksPageProps {
  showHeader?: boolean;
}

export function BookmarksPage({ showHeader = true }: BookmarksPageProps) {
  const {
    savedItems,
    models,
    tools,
    toggleModelBookmark,
    toggleToolBookmark,
    toggleSavedTarget,
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

  // Resolve saved repositories
  const savedRepositories = useMemo(() => {
    return savedItems.filter((item) => item.kind === "repository");
  }, [savedItems]);

  // Categories with live computed counts
  const categories = useMemo(
    () => [
      { id: "all" as const, label: "Все", count: savedItems.length },
      { id: "model" as const, label: "Модели", count: savedModels.length },
      { id: "tool" as const, label: "Инструменты", count: savedTools.length },
      { id: "repository" as const, label: "Репозитории", count: savedRepositories.length },
    ],
    [savedItems.length, savedModels.length, savedTools.length, savedRepositories.length],
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

  const renderContentControls = () => (
    <div className={styles.filterBar}>
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
    </div>
  );

  return (
    <div className={styles.page}>
      {showHeader ? (
        <PageHeader title="Закладки">{renderContentControls()}</PageHeader>
      ) : (
        renderContentControls()
      )}

      {savedItems.length === 0 ? (
        <EmptyState>
          <p>Здесь появятся сохранённые модели, инструменты и репозитории.</p>
        </EmptyState>
      ) : activeTab === "all" ? (
        <>
          {savedModels.length > 0 ? (
            <section aria-label="Сохранённые модели">
              {savedTools.length > 0 || savedRepositories.length > 0 ? (
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
              {savedModels.length > 0 || savedRepositories.length > 0 ? (
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

          {savedRepositories.length > 0 ? (
            <section aria-label="Сохранённые репозитории">
              {savedModels.length > 0 || savedTools.length > 0 ? (
                <h3 className={styles.groupTitle}>Репозитории</h3>
              ) : null}
              <ul className={styles.list}>
                {savedRepositories.map((repo) => (
                  <li key={repo.id} id={`saved-repo-${repo.targetId.replace(/\//g, "-")}`}>
                    <RepositoryRow
                      item={repo}
                      bookmarked={true}
                      onBookmark={() => toggleSavedTarget(repo)}
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
      ) : activeTab === "repository" ? (
        savedRepositories.length === 0 ? (
          <EmptyState>
            <p>Сохранённых репозиториев пока нет.</p>
          </EmptyState>
        ) : (
          <ul className={styles.list}>
            {savedRepositories.map((repo) => (
              <li key={repo.id} id={`saved-repo-${repo.targetId.replace(/\//g, "-")}`}>
                <RepositoryRow
                  item={repo}
                  bookmarked={true}
                  onBookmark={() => toggleSavedTarget(repo)}
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
export { SavedPage } from "../Saved";

