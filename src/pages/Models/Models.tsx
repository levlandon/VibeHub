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
import { useI18n } from "../../i18n";

const CAPABILITY_OPTIONS = [
  { value: "vision", key: "models.vision" },
  { value: "reasoning", key: "models.reasoning" },
  { value: "tools", key: "models.tools" },
  { value: "audio", key: "models.audio" },
  { value: "free", key: "models.free" },
];

const SORT_OPTIONS: { value: ModelSort; key: string }[] = [
  { value: "catalog", key: "models.sort.catalog" },
  { value: "new", key: "models.sort.new" },
  { value: "context-desc", key: "models.sort.contextDesc" },
  { value: "context-asc", key: "models.sort.contextAsc" },
  { value: "price-asc", key: "models.sort.priceAsc" },
  { value: "name", key: "models.sort.name" },
];

export function ModelsPage() {
  const { t } = useI18n();
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
    const allOpt = { value: "all", label: t("models.allProviders", { count: providers.length }) };
    return [allOpt, ...providers.map((p) => ({ value: p, label: p }))];
  }, [providers, t]);

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
      <PageHeader title={t("models.title")}>
        <div className={styles.toolbar}>
          <Select
            label={t("models.provider")}
            value={provider}
            options={providerOptions}
            onChange={handleProviderChange}
            searchable
            searchPlaceholder={t("models.searchProvider")}
          />
          <Select
            label={t("models.capabilities")}
            multiple
            value={capabilities}
            options={CAPABILITY_OPTIONS.map((option) => ({ value: option.value, label: option.key ? t(option.key) : option.value }))}
            onChange={setCapabilities}
            placeholder={t("feed.all")}
          />
          <Select
            label={t("models.sort")}
            value={sort}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.key) }))}
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
            {t("models.retry")}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState>
          <p>{t("models.empty")}</p>
          {hasActiveFilters ? (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setCapabilities([]);
                handleProviderChange("all");
              }}
            >
              {t("saved.resetFilters")}
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <div className={styles.listHeader}>
            <div className={styles.countInfo}>
              {t("models.shown", { shown: visible.length, total: models.length })}
            </div>
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

