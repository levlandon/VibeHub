import { memo, useMemo, useState, type KeyboardEvent } from "react";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { IconButton } from "../../components/IconButton/IconButton";
import {
  IconAudio,
  IconBookmark,
  IconBrain,
  IconLayers,
  IconTools,
  IconVision,
} from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ProviderMark } from "../../components/ProviderMark/ProviderMark";
import { Select } from "../../components/ui/Select";
import { filterAndSortModels } from "../../services/models";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { Model, ModelSort } from "../../types/models";
import { formatFullDate, formatModelDate } from "../../utils/dateFormat";
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

  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [provider, setProvider] = useState("all");
  const [sort, setSort] = useState<ModelSort>("catalog");

  const providers = useMemo(
    () => [...new Set(models.map((m) => m.provider))].sort((a, b) => a.localeCompare(b)),
    [models],
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
            onChange={setProvider}
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

const ModelRow = memo(function ModelRow({
  model,
  bookmarked,
  onBookmark,
  onOpen,
}: {
  model: Model;
  bookmarked: boolean;
  onBookmark: () => void;
  onOpen: () => void;
}) {
  const hasReasoning = model.capabilities.includes("Reasoning");
  const hasVision = model.capabilities.includes("Vision");
  const hasTools = model.capabilities.includes("Tools");
  const hasAudio = model.capabilities.includes("Audio");

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
      aria-label={`Открыть модель ${model.name} (${model.provider})`}
    >
      <ProviderMark model={model} />
      <div className={styles.body}>
        <h2 className={styles.name}>{model.name}</h2>
        <p className={styles.provider}>{model.provider}</p>
        <div className={styles.metaRow}>
          <span
            className={styles.contextWindow}
            title={`Контекстное окно: ${model.contextLength.toLocaleString("ru-RU")} токенов`}
          >
            <IconLayers width={14} height={14} className={styles.metaIcon} aria-hidden />
            <span>{model.contextWindow}</span>
          </span>
          <span
            className={`${styles.pricing} ${model.pricing.isFree ? styles.pricingFree : ""}`}
            title={`Цена: Prompt $${model.pricing.promptPerMillion.toFixed(2)} / Completion $${model.pricing.completionPerMillion.toFixed(2)} за 1M токенов`}
          >
            {model.pricing.formattedSummary}
          </span>
          {hasReasoning || hasVision || hasTools || hasAudio ? (
            <div className={styles.capabilities} aria-label="Возможности">
              {hasReasoning ? (
                <span className={styles.capIcon} title="Reasoning" aria-label="Reasoning">
                  <IconBrain width={16} height={16} />
                </span>
              ) : null}
              {hasVision ? (
                <span className={styles.capIcon} title="Vision" aria-label="Vision">
                  <IconVision width={16} height={16} />
                </span>
              ) : null}
              {hasTools ? (
                <span className={styles.capIcon} title="Tool use" aria-label="Tool use">
                  <IconTools width={16} height={16} />
                </span>
              ) : null}
              {hasAudio ? (
                <span className={styles.capIcon} title="Audio" aria-label="Audio">
                  <IconAudio width={16} height={16} />
                </span>
              ) : null}
            </div>
          ) : null}
          {model.releaseDate ? (
            <span
              className={styles.date}
              title={formatFullDate(model.releaseDate)}
            >
              {formatModelDate(model.releaseDate)}
            </span>
          ) : null}
        </div>
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

