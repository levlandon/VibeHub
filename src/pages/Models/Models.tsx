import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ModelRow } from "../../components/ModelRow";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { Select } from "../../components/ui/Select";
import { filterAndSortModels } from "../../services/models";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { ModelSort } from "../../types/models";
import { ModelSkeletonList } from "./ModelSkeleton";
import styles from "./Models.module.css";

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

export function ModelsPage() {
  const {
    models,
    modelsLoading,
    modelsError,
    refreshModels,
    savedItems,
    toggleModelBookmark,
    openEntity,
  } = useHub();

  const search = useSearch({ strict: false }) as { provider?: string } | undefined;
  const searchProvider = search?.provider;
  const navigate = useNavigate();

  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [sort, setSort] = useState<ModelSort>("catalog");

  const providers = useMemo(
    () => [...new Set(models.map((m) => m.provider))].sort((a, b) => a.localeCompare(b)),
    [models],
  );

  const provider = useMemo(() => {
    if (!searchProvider) return "all";
    const matched = providers.find((p) => p.toLowerCase() === searchProvider.toLowerCase());
    return matched || searchProvider;
  }, [searchProvider, providers]);

  const handleProviderChange = useCallback(
    (nextProvider: string) => {
      navigate({
        to: "/models",
        search: nextProvider === "all" ? {} : { provider: nextProvider },
      });
    },
    [navigate],
  );

  const providerOptions = useMemo(() => {
    const allOpt = { value: "all", label: `Все (${providers.length})` };
    return [allOpt, ...providers.map((p) => ({ value: p, label: p }))];
  }, [providers]);

  const visible = useMemo(
    () =>
      filterAndSortModels(models, {
        capabilities,
        provider,
        sort,
      }),
    [models, capabilities, provider, sort],
  );

  const hasActiveFilters = capabilities.length > 0 || provider !== "all";

  return (
    <div className={styles.page}>
      <PageHeader title="Модели">
        <div className={styles.toolbar}>
          <Select
            label="Provider"
            value={provider}
            options={providerOptions}
            onChange={handleProviderChange}
            searchable
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
      </PageHeader>

      {modelsLoading && models.length === 0 ? (
        <ModelSkeletonList count={8} />
      ) : modelsError && models.length === 0 ? (
        <div className={styles.errorBox}>
          <p>{modelsError}</p>
          <button type="button" className={styles.retryBtn} onClick={() => refreshModels()}>
            Повторить попытку
          </button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState>
          <p>Модели не найдены по выбранным фильтрам.</p>
          {hasActiveFilters ? (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setCapabilities([]);
                handleProviderChange("all");
              }}
            >
              Сбросить фильтры
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <div className={styles.countInfo}>
            Показано моделей: {visible.length}
            {visible.length !== models.length ? ` из ${models.length}` : ""}
          </div>
          <ul className={styles.list}>
            {visible.map((model) => (
              <li key={model.id} id={`model-${model.id.replace(/\//g, "-")}`}>
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
      )}
    </div>
  );
}

