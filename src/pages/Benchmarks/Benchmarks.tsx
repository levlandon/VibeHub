import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ProviderMark } from "../../components/ProviderMark/ProviderMark";
import {
  IconBot,
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconCode,
  IconGauge,
  IconGithub,
  IconGlobe,
  IconInfo,
  IconListChecks,
  IconMath,
  IconOpen,
  IconSearch,
  IconSparkles,
  IconVision,
} from "../../components/icons";
import {
  benchmarkService,
  isLowerIsBetterBenchmark,
  sortAndRankBenchmarkEntries,
  sortAndRankCategoryModels,
  sortAndRankOverviewModels,
  sortAndRankSpeedEntries,
  type Benchmark,
  type BenchmarkCategoryInfo,
  type BenchmarkLeaderboardEntry,
  type CategorySortColumn,
  type CategorySummary,
  type OverviewModelEntry,
  type OverviewSortColumn,
  type SortDirection,
  type SpeedLeaderboardEntry,
  type SpeedSortColumn,
} from "../../services/benchmarks";
import { useHub } from "../../state/HubContext";
import styles from "./Benchmarks.module.css";

/**
 * Fixed canonical category definitions for consistent order and display normalization
 */
const CANONICAL_CATEGORIES = [
  {
    id: "knowledge",
    label: "Knowledge",
    rawKeys: ["knowledge"],
    icon: (cls?: string) => <IconBrain width={16} height={16} className={cls} />,
  },
  {
    id: "coding",
    label: "Coding",
    rawKeys: ["coding", "code"],
    icon: (cls?: string) => <IconCode width={16} height={16} className={cls} />,
  },
  {
    id: "reasoning",
    label: "Reasoning",
    rawKeys: ["reasoning"],
    icon: (cls?: string) => <IconSparkles width={16} height={16} className={cls} />,
  },
  {
    id: "instructionFollowing",
    label: "Instruction Following",
    rawKeys: ["instructionfollowing", "instruction_following", "instruction"],
    icon: (cls?: string) => <IconListChecks width={16} height={16} className={cls} />,
  },
  {
    id: "agentic",
    label: "Agentic",
    rawKeys: ["agentic", "agents"],
    icon: (cls?: string) => <IconBot width={16} height={16} className={cls} />,
  },
  {
    id: "multimodalGrounded",
    label: "Multimodal & Grounded",
    rawKeys: ["multimodalgrounded", "multimodal_grounded", "multimodal", "vision"],
    icon: (cls?: string) => <IconVision width={16} height={16} className={cls} />,
  },
  {
    id: "math",
    label: "Mathematics",
    rawKeys: ["math", "mathematics"],
    icon: (cls?: string) => <IconMath width={16} height={16} className={cls} />,
  },
  {
    id: "multilingual",
    label: "Multilingual",
    rawKeys: ["multilingual"],
    icon: (cls?: string) => <IconGlobe width={16} height={16} className={cls} />,
  },
];

function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return null;
  return (
    <span className={styles.sortArrow} aria-hidden="true">
      {direction === "asc" ? "▲" : "▼"}
    </span>
  );
}

export function BenchmarksPage() {
  const { models } = useHub();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });

  // Direct benchmark route support: /benchmarks/:id
  const urlBenchmarkId = useMemo(() => {
    const match = pathname.match(/^\/benchmarks\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<BenchmarkCategoryInfo[]>([]);
  const [allBenchmarks, setAllBenchmarks] = useState<Benchmark[]>([]);
  const [speedItems, setSpeedItems] = useState<SpeedLeaderboardEntry[]>([]);
  const [overviewModels, setOverviewModels] = useState<OverviewModelEntry[]>([]);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState<string>("");

  // Sort states
  const [overviewSort, setOverviewSort] = useState<{
    column: OverviewSortColumn;
    direction: SortDirection;
  }>({ column: "score", direction: "desc" });

  const [categorySort, setCategorySort] = useState<{
    column: CategorySortColumn;
    direction: SortDirection;
  }>({ column: "score", direction: "desc" });

  const [benchmarkSort, setBenchmarkSort] = useState<{
    direction: SortDirection;
  }>({ direction: "desc" });

  const [speedSort, setSpeedSort] = useState<{
    column: SpeedSortColumn;
    direction: SortDirection;
  }>({ column: "speed", direction: "desc" });

  // Category overview data
  const [categorySummary, setCategorySummary] = useState<CategorySummary | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Leaderboard data for selected benchmark
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<BenchmarkLeaderboardEntry[]>([]);

  // Known VibeHub providers for link matching
  const knownProviders = useMemo(() => {
    return new Set(models.map((m) => m.provider.toLowerCase()));
  }, [models]);

  // Initial data loading
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await benchmarkService.getData({ forceRefresh });
      setAllBenchmarks(data.benchmarks);
      setCategories(data.categories);

      const [overview, speed] = await Promise.all([
        benchmarkService.getOverviewModels(models, { forceRefresh }),
        benchmarkService.getSpeedLeaderboard(models, { forceRefresh }),
      ]);
      setOverviewModels(overview);
      setSpeedItems(speed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить данные бенчмарков. Попробуйте обновить страницу.",
      );
    } finally {
      setLoading(false);
    }
  }, [models]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync category & benchmark if URL has /benchmarks/:id
  useEffect(() => {
    if (urlBenchmarkId && allBenchmarks.length > 0) {
      const target = allBenchmarks.find(
        (b) => b.id.toLowerCase() === urlBenchmarkId.toLowerCase(),
      );
      if (target) {
        setSelectedCategory(target.category);
        setSelectedBenchmarkId(target.id);
        const isLower = isLowerIsBetterBenchmark(target);
        setBenchmarkSort({ direction: isLower ? "asc" : "desc" });
      }
    }
  }, [urlBenchmarkId, allBenchmarks]);

  // Load category summary when selectedCategory is a specific benchmark category
  useEffect(() => {
    if (selectedCategory === "all" || selectedCategory === "speed") {
      setCategorySummary(null);
      return;
    }

    let isMounted = true;
    setCategoryLoading(true);

    benchmarkService
      .getCategorySummary(selectedCategory, models)
      .then((summary) => {
        if (isMounted) {
          setCategorySummary(summary);
        }
      })
      .catch((err) => {
        console.error("Failed to load category summary:", err);
      })
      .finally(() => {
        if (isMounted) {
          setCategoryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategory, models]);

  // Selected benchmark object
  const currentBenchmark = useMemo(() => {
    if (!selectedBenchmarkId) return null;
    return (
      allBenchmarks.find(
        (b) => b.id.toLowerCase() === selectedBenchmarkId.toLowerCase(),
      ) || null
    );
  }, [allBenchmarks, selectedBenchmarkId]);

  // Fetch leaderboard when selectedBenchmarkId changes
  useEffect(() => {
    if (!selectedBenchmarkId) {
      setLeaderboard([]);
      return;
    }

    let isMounted = true;
    setLeaderboardLoading(true);

    benchmarkService
      .getBenchmarkLeaderboard(selectedBenchmarkId, models)
      .then((lb) => {
        if (isMounted) {
          setLeaderboard(lb);
        }
      })
      .catch((err) => {
        console.error("Failed to load benchmark leaderboard:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLeaderboardLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedBenchmarkId, models]);

  // Category change with dependent filter validation and sort reset
  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setOverviewSort({ column: "score", direction: "desc" });
    setCategorySort({ column: "score", direction: "desc" });
    setSpeedSort({ column: "speed", direction: "desc" });

    // If currently selected benchmark doesn't belong to the newly selected category, reset it
    if (selectedBenchmarkId && catId !== "all") {
      const current = allBenchmarks.find((b) => b.id === selectedBenchmarkId);
      if (current && current.category.toLowerCase() !== catId.toLowerCase()) {
        setSelectedBenchmarkId(null);
        navigate({ to: "/benchmarks" });
        return;
      }
    }

    if (!selectedBenchmarkId) {
      navigate({ to: "/benchmarks" });
    }
  };

  // Benchmark change with auto category sync and sort reset
  const handleBenchmarkChange = (bId: string | null) => {
    if (!bId) {
      setSelectedBenchmarkId(null);
      navigate({ to: "/benchmarks" });
      return;
    }
    const target = allBenchmarks.find(
      (b) => b.id.toLowerCase() === bId.toLowerCase(),
    );
    if (target) {
      setSelectedCategory(target.category);
      setSelectedBenchmarkId(target.id);
      const isLower = isLowerIsBetterBenchmark(target);
      setBenchmarkSort({ direction: isLower ? "asc" : "desc" });
      navigate({ to: `/benchmarks/${encodeURIComponent(target.id)}` });
    }
  };

  // Sort toggle handlers
  const handleToggleOverviewSort = (column: OverviewSortColumn) => {
    setOverviewSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === "desc" ? "asc" : "desc" };
      }
      return { column, direction: "desc" };
    });
  };

  const handleToggleCategorySort = (column: CategorySortColumn) => {
    setCategorySort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === "desc" ? "asc" : "desc" };
      }
      return { column, direction: "desc" };
    });
  };

  const handleToggleBenchmarkSort = () => {
    setBenchmarkSort((prev) => ({
      direction: prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleToggleSpeedSort = (column: SpeedSortColumn) => {
    setSpeedSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === "desc" ? "asc" : "desc" };
      }
      return { column, direction: column === "latency" ? "asc" : "desc" };
    });
  };

  // Model link navigation
  const handleOpenModel = (modelId?: string) => {
    if (modelId) {
      navigate({ to: `/models/${modelId}` });
    }
  };

  // Provider link navigation
  const handleOpenProvider = (e: React.MouseEvent, providerName?: string) => {
    e.stopPropagation();
    if (providerName) {
      navigate({ to: "/models", search: { provider: providerName } });
    }
  };

  // Available benchmarks for the benchmark dropdown
  const availableBenchmarks = useMemo(() => {
    if (selectedCategory === "all" || selectedCategory === "speed") {
      return allBenchmarks;
    }
    return allBenchmarks.filter(
      (b) => b.category.toLowerCase() === selectedCategory.toLowerCase(),
    );
  }, [allBenchmarks, selectedCategory]);

  // Filtered and sorted Overview models
  const filteredOverviewModels = useMemo(() => {
    return sortAndRankOverviewModels(overviewModels, {
      sortBy: overviewSort.column,
      direction: overviewSort.direction,
      query: modelSearchQuery,
    });
  }, [overviewModels, overviewSort, modelSearchQuery]);

  // Filtered and sorted Category models
  const filteredCategoryModels = useMemo(() => {
    if (!categorySummary) return [];
    return sortAndRankCategoryModels(categorySummary.models, {
      sortBy: categorySort.column,
      direction: categorySort.direction,
      query: modelSearchQuery,
    });
  }, [categorySummary, categorySort, modelSearchQuery]);

  // Filtered and sorted Leaderboard rows
  const filteredLeaderboard = useMemo(() => {
    return sortAndRankBenchmarkEntries(leaderboard, currentBenchmark, {
      direction: benchmarkSort.direction,
      query: modelSearchQuery,
    });
  }, [leaderboard, currentBenchmark, benchmarkSort.direction, modelSearchQuery]);

  // Filtered and sorted Speed rows
  const filteredSpeedItems = useMemo(() => {
    return sortAndRankSpeedEntries(speedItems, {
      sortBy: speedSort.column,
      direction: speedSort.direction,
      query: modelSearchQuery,
    });
  }, [speedItems, speedSort, modelSearchQuery]);

  // Active item count to show in toolbar
  const resultCount = useMemo(() => {
    if (selectedBenchmarkId) {
      return filteredLeaderboard.length;
    }
    if (selectedCategory === "speed") {
      return filteredSpeedItems.length;
    }
    if (selectedCategory !== "all") {
      return filteredCategoryModels.length;
    }
    return filteredOverviewModels.length;
  }, [
    selectedBenchmarkId,
    selectedCategory,
    filteredLeaderboard.length,
    filteredSpeedItems.length,
    filteredCategoryModels.length,
    filteredOverviewModels.length,
  ]);

  return (
    <div className={styles.page} data-page="wide">
      <div className={styles.headerRowWrap}>
        <PageHeader title="Бенчмарки" />
        <a
          href="https://github.com/benchlmirror/benchlmirror.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.headerCreditLink}
          aria-label="Данные бенчмарков: публичное зеркало BenchLMirror на GitHub"
          title="Открыть репозиторий BenchLMirror (GitHub)"
        >
          <IconGithub width={14} height={14} className={styles.headerCreditIcon} />
          <span>BenchLMirror</span>
          <IconOpen width={11} height={11} className={styles.headerCreditArrow} />
        </a>
      </div>

      {/* Unified Single Toolbar: Search, Category Filter, Benchmark Filter, Count */}
      <div className={styles.unifiedToolbar}>
        <div className={styles.toolbarFilters}>
          {/* 1. Model Search */}
          <div className={styles.searchBox}>
            <IconSearch width={14} height={14} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Найти модель..."
              value={modelSearchQuery}
              onChange={(e) => setModelSearchQuery(e.target.value)}
            />
          </div>

          {/* 2. Normalized Category Dropdown */}
          <CategoryFilterDropdown
            categories={categories}
            selectedId={selectedCategory}
            onSelect={handleCategoryChange}
          />

          {/* 3. Benchmark Dropdown with Coverage Threshold & Rare Toggle */}
          {selectedCategory !== "speed" && (
            <BenchmarkFilterDropdown
              benchmarks={availableBenchmarks}
              selectedId={selectedBenchmarkId}
              onSelect={handleBenchmarkChange}
            />
          )}
        </div>

        {/* 4. Result Count */}
        <div className={styles.toolbarCount}>
          {resultCount} {pluralizeModels(resultCount)}
        </div>
      </div>

      {/* Loading state */}
      {loading && allBenchmarks.length === 0 ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Загрузка данных бенчмарков...</p>
        </div>
      ) : error && allBenchmarks.length === 0 ? (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={() => loadData(true)}>
            Повторить попытку
          </button>
        </div>
      ) : (
        <section className={styles.tableSection}>
          {/* ============================================================ */}
          {/* STATE C: CONCRETE BENCHMARK SELECTED */}
          {/* ============================================================ */}
          {selectedBenchmarkId && currentBenchmark ? (
            <div className={styles.benchmarkDetailBlock}>
              <header className={styles.benchmarkMetaCard}>
                <div className={styles.benchmarkMetaTop}>
                  <div className={styles.benchmarkTitleRow}>
                    <h2 className={styles.benchmarkTitle}>{currentBenchmark.name}</h2>
                    <span className={styles.badge}>{currentBenchmark.categoryLabel}</span>
                  </div>

                  <div className={styles.benchmarkLinks}>
                    {currentBenchmark.paperUrl && (
                      <a
                        href={currentBenchmark.paperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.metaLink}
                        aria-label={`Открыть исследовательскую статью по тесту ${currentBenchmark.name}`}
                      >
                        <span>Paper</span>
                        <IconOpen width={11} height={11} />
                      </a>
                    )}
                    {currentBenchmark.url && (
                      <a
                        href={currentBenchmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.metaLink}
                        aria-label={`Открыть страницу теста ${currentBenchmark.name} на BenchLM`}
                      >
                        <span>BenchLM</span>
                        <IconOpen width={11} height={11} />
                      </a>
                    )}
                  </div>
                </div>

                {(currentBenchmark.description ||
                  (currentBenchmark as { descriptionOriginal?: string })
                    .descriptionOriginal) && (
                  <p className={styles.benchmarkDesc}>
                    {currentBenchmark.description ||
                      (currentBenchmark as { descriptionOriginal?: string })
                        .descriptionOriginal}
                    <span
                      className={styles.sourceLangLabel}
                      title="Описание из первоисточника на английском языке"
                      aria-label="Описание из первоисточника (EN)"
                    >
                      EN
                    </span>
                  </p>
                )}

                {currentBenchmark.tasks && (
                  <p className={styles.benchmarkTasks}>
                    <strong>Задачи:</strong> {currentBenchmark.tasks}
                  </p>
                )}
              </header>

              {leaderboardLoading ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner} />
                  <p>Загрузка результатов...</p>
                </div>
              ) : filteredLeaderboard.length === 0 ? (
                <EmptyState>
                  <p>
                    {modelSearchQuery
                      ? `Модели по запросу «${modelSearchQuery}» не найдены.`
                      : "Для этого теста пока нет сохраненных результатов моделей."}
                  </p>
                </EmptyState>
              ) : (
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr className={`${styles.headerRow} ${styles.gridBenchmark}`}>
                        <th className={styles.thLeft} title="Позиция модели в текущей выборке">
                          Ранг
                        </th>
                        <th className={styles.thLeft}>Модель</th>
                        <th className={styles.thLeft}>Провайдер</th>
                        <th
                          className={`${styles.thCenter} ${styles.thSortable} ${styles.thSortActive}`}
                          onClick={handleToggleBenchmarkSort}
                          role="button"
                          tabIndex={0}
                          aria-sort={benchmarkSort.direction === "asc" ? "ascending" : "descending"}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggleBenchmarkSort();
                            }
                          }}
                          title={`Сортировка: ${benchmarkSort.direction === "desc" ? "по убыванию" : "по возрастанию"}`}
                        >
                          <span className={styles.sortHeaderContent}>
                            Score
                            <SortIndicator active={true} direction={benchmarkSort.direction} />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaderboard.map((row, idx) => {
                        const localRank = row.rank || idx + 1;
                        const isClickable = !!row.matchedModelId;

                        return (
                          <tr
                            key={row.modelKey}
                            className={`${styles.tableRow} ${styles.gridBenchmark} ${isClickable ? styles.clickableRow : ""}`}
                            onClick={() => handleOpenModel(row.matchedModelId)}
                            role={isClickable ? "button" : undefined}
                            tabIndex={isClickable ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (isClickable && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                handleOpenModel(row.matchedModelId);
                              }
                            }}
                          >
                            <td className={styles.rankCell}>
                              <span
                                className={`${styles.rankBadge} ${
                                  localRank === 1
                                    ? styles.rank1
                                    : localRank === 2
                                      ? styles.rank2
                                      : localRank === 3
                                        ? styles.rank3
                                        : ""
                                }`}
                              >
                                #{localRank}
                              </span>
                            </td>
                            <td>
                              <div className={styles.modelNameCell}>
                                <ProviderMark
                                  provider={row.provider || row.creator}
                                  modelName={row.modelName}
                                  size={20}
                                  className={styles.modelIcon}
                                />
                                <span
                                  className={`${styles.modelNameText} ${
                                    row.matchedModelId ? styles.modelNameLinked : ""
                                  }`}
                                >
                                  {row.modelName}
                                </span>
                              </div>
                            </td>
                            <td className={styles.providerCell}>
                              {row.provider &&
                              knownProviders.has(row.provider.toLowerCase()) ? (
                                <span
                                  className={styles.providerLink}
                                  onClick={(e) => handleOpenProvider(e, row.provider)}
                                  title={`Показать все модели ${row.provider}`}
                                  role="button"
                                  tabIndex={0}
                                >
                                  {row.provider}
                                </span>
                              ) : (
                                <span className={styles.providerPlain}>
                                  {row.provider || row.creator || "—"}
                                </span>
                              )}
                            </td>
                            <td className={styles.scoreCell}>{formatScore(row.score)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : selectedCategory === "speed" ? (
            /* ============================================================ */
            /* STATE D: SPEED CATEGORY */
            /* ============================================================ */
            filteredSpeedItems.length === 0 ? (
              <EmptyState>
                <p>Модели не найдены по запросу «{modelSearchQuery}».</p>
              </EmptyState>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={`${styles.headerRow} ${styles.gridSpeed}`}>
                      <th className={styles.thLeft} title="Позиция модели в текущей выборке">
                        Ранг
                      </th>
                      <th className={styles.thLeft}>Модель</th>
                      <th className={styles.thLeft}>Провайдер</th>
                      <th
                        className={`${styles.thRight} ${styles.thSortable} ${
                          speedSort.column === "speed" ? styles.thSortActive : ""
                        }`}
                        onClick={() => handleToggleSpeedSort("speed")}
                        role="button"
                        tabIndex={0}
                        aria-sort={
                          speedSort.column === "speed"
                            ? speedSort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleSpeedSort("speed");
                          }
                        }}
                        title="Сортировать по скорости генерации"
                      >
                        <span className={styles.sortHeaderContent}>
                          Токенов / сек
                          <SortIndicator
                            active={speedSort.column === "speed"}
                            direction={speedSort.direction}
                          />
                        </span>
                      </th>
                      <th
                        className={`${styles.thRight} ${styles.thSortable} ${
                          speedSort.column === "latency" ? styles.thSortActive : ""
                        }`}
                        onClick={() => handleToggleSpeedSort("latency")}
                        role="button"
                        tabIndex={0}
                        aria-sort={
                          speedSort.column === "latency"
                            ? speedSort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleSpeedSort("latency");
                          }
                        }}
                        title="Сортировать по задержке первого токена (TTFT)"
                      >
                        <span className={styles.sortHeaderContent}>
                          TTFT (латентность)
                          <SortIndicator
                            active={speedSort.column === "latency"}
                            direction={speedSort.direction}
                          />
                        </span>
                      </th>
                      <th className={styles.thLeft}>Источник</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpeedItems.map((item, idx) => {
                      const localRank = item.rank || idx + 1;
                      const isClickable = !!item.matchedModelId;

                      return (
                        <tr
                          key={item.modelKey}
                          className={`${styles.tableRow} ${styles.gridSpeed} ${isClickable ? styles.clickableRow : ""}`}
                          onClick={() => handleOpenModel(item.matchedModelId)}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (isClickable && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleOpenModel(item.matchedModelId);
                            }
                          }}
                        >
                          <td className={styles.rankCell}>
                            <span
                              className={`${styles.rankBadge} ${
                                localRank === 1
                                  ? styles.rank1
                                  : localRank === 2
                                    ? styles.rank2
                                    : localRank === 3
                                      ? styles.rank3
                                      : ""
                              }`}
                            >
                              #{localRank}
                            </span>
                          </td>
                          <td>
                            <div className={styles.modelNameCell}>
                              <ProviderMark
                                provider={item.provider || item.creator}
                                modelName={item.modelName}
                                size={20}
                                className={styles.modelIcon}
                              />
                              <span
                                className={`${styles.modelNameText} ${
                                  item.matchedModelId ? styles.modelNameLinked : ""
                                }`}
                              >
                                {item.modelName}
                              </span>
                            </div>
                          </td>
                          <td className={styles.providerCell}>
                            {item.provider &&
                            knownProviders.has(item.provider.toLowerCase()) ? (
                              <span
                                className={styles.providerLink}
                                onClick={(e) => handleOpenProvider(e, item.provider)}
                                title={`Показать все модели ${item.provider}`}
                                role="button"
                                tabIndex={0}
                              >
                                {item.provider}
                              </span>
                            ) : (
                              <span className={styles.providerPlain}>
                                {item.provider || item.creator || "—"}
                              </span>
                            )}
                          </td>
                          <td className={styles.speedCell}>
                            <strong>{item.tokensPerSecond}</strong>{" "}
                            <span className={styles.unit}>t/s</span>
                          </td>
                          <td className={styles.ttftCell}>
                            {typeof item.ttft === "number" && !isNaN(item.ttft)
                              ? `${item.ttft.toFixed(2)}s`
                              : "—"}
                          </td>
                          <td className={styles.sourceCell}>
                            {item.sourceUrl ? (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.sourceLink}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.source || "Artificial Analysis"} ↗
                              </a>
                            ) : (
                              item.source || "Artificial Analysis"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : selectedCategory !== "all" ? (
            /* ============================================================ */
            /* STATE B: SPECIFIC CATEGORY + ALL TESTS */
            /* ============================================================ */
            categoryLoading && !categorySummary ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Загрузка категории...</p>
              </div>
            ) : categorySummary && filteredCategoryModels.length === 0 ? (
              <EmptyState>
                <p>Модели в категории «{categorySummary.categoryLabel}» не найдены.</p>
              </EmptyState>
            ) : categorySummary ? (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={`${styles.headerRow} ${styles.gridCategory}`}>
                      <th className={styles.thCenter} title="Позиция модели в текущей выборке">
                        #
                      </th>
                      <th className={styles.thLeft}>Модель</th>
                      <th className={styles.thLeft}>Провайдер</th>
                      <th
                        className={`${styles.thCenter} ${styles.thSortable} ${
                          categorySort.column === "coverage" ? styles.thSortActive : ""
                        }`}
                        onClick={() => handleToggleCategorySort("coverage")}
                        role="button"
                        tabIndex={0}
                        aria-sort={
                          categorySort.column === "coverage"
                            ? categorySort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleCategorySort("coverage");
                          }
                        }}
                        title="Сортировать по количеству пройденных тестов"
                      >
                        <span className={styles.sortHeaderContent}>
                          Покрытие
                          <SortIndicator
                            active={categorySort.column === "coverage"}
                            direction={categorySort.direction}
                          />
                        </span>
                      </th>
                      <th
                        className={`${styles.thCenter} ${styles.thSortable} ${
                          categorySort.column === "score" ? styles.thSortActive : ""
                        }`}
                        onClick={() => handleToggleCategorySort("score")}
                        role="button"
                        tabIndex={0}
                        aria-sort={
                          categorySort.column === "score"
                            ? categorySort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleCategorySort("score");
                          }
                        }}
                        title="Официальный балл категории BenchLM. Кликните для сортировки."
                      >
                        <span className={styles.sortHeaderContent}>
                          <span
                            className={styles.thWithInfo}
                            title="Официальный балл категории BenchLM."
                          >
                            Score
                            <IconInfo width={12} height={12} className={styles.infoIcon} />
                          </span>
                          <SortIndicator
                            active={categorySort.column === "score"}
                            direction={categorySort.direction}
                          />
                        </span>
                      </th>
                      <th className={styles.thCenter}>Уровень</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategoryModels.map((m, idx) => {
                      const localRank = idx + 1;
                      const isClickable = !!m.matchedModelId;
                      const catDef = CANONICAL_CATEGORIES.find((c) =>
                        c.rawKeys.includes(selectedCategory.toLowerCase()),
                      );

                      return (
                        <tr
                          key={m.modelKey}
                          className={`${styles.tableRow} ${styles.gridCategory} ${isClickable ? styles.clickableRow : ""}`}
                          onClick={() => handleOpenModel(m.matchedModelId)}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (isClickable && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleOpenModel(m.matchedModelId);
                            }
                          }}
                        >
                          <td className={styles.rankCellCenter}>
                            <span
                              className={`${styles.rankBadge} ${
                                localRank === 1
                                  ? styles.rank1
                                  : localRank === 2
                                    ? styles.rank2
                                    : localRank === 3
                                      ? styles.rank3
                                      : ""
                              }`}
                            >
                              #{localRank}
                            </span>
                          </td>
                          <td>
                            <div className={styles.modelNameCell}>
                              <ProviderMark
                                provider={m.provider || m.creator}
                                modelName={m.modelName}
                                size={20}
                                className={styles.modelIcon}
                              />
                              <span
                                className={`${styles.modelNameText} ${
                                  m.matchedModelId ? styles.modelNameLinked : ""
                                }`}
                              >
                                {m.modelName}
                              </span>
                            </div>
                          </td>
                          <td className={styles.providerCell}>
                            {m.provider &&
                            knownProviders.has(m.provider.toLowerCase()) ? (
                              <span
                                className={styles.providerLink}
                                onClick={(e) => handleOpenProvider(e, m.provider)}
                                title={`Показать все модели ${m.provider}`}
                                role="button"
                                tabIndex={0}
                              >
                                {m.provider}
                              </span>
                            ) : (
                              <span className={styles.providerPlain}>
                                {m.provider || m.creator || "—"}
                              </span>
                            )}
                          </td>
                          <td
                            className={styles.coverageCell}
                            title={`Результаты доступны в ${m.categoryCoverageCount} из ${m.totalCategoryBenchmarks} тестов категории ${categorySummary.categoryLabel}.`}
                          >
                            <span className={styles.coverageNumerator}>
                              {m.categoryCoverageCount}
                            </span>
                            <span className={styles.coverageDenominator}>
                              {" "}
                              / {m.totalCategoryBenchmarks}
                            </span>
                          </td>
                          <td className={styles.scoreCell}>
                            {m.categoryScore !== undefined ? formatScore(m.categoryScore) : "—"}
                          </td>
                          <td className={styles.levelCell}>
                            {(() => {
                              const hasData =
                                m.categoryScore !== undefined &&
                                m.categoryScore !== null &&
                                !isNaN(m.categoryScore);
                              const catLabel =
                                catDef?.label ||
                                categorySummary.categoryLabel ||
                                formatCategoryName(selectedCategory);
                              const tooltipText = hasData
                                ? `${catLabel} · ${m.categoryScore!.toFixed(1)}`
                                : `${catLabel} · нет данных`;
                              const colorClass = getScoreColorClass(m.categoryScore);

                              return (
                                <span
                                  className={`${styles.strengthSlot} ${colorClass} ${
                                    !hasData ? styles.slotMissing : ""
                                  }`}
                                  title={tooltipText}
                                  aria-label={tooltipText}
                                >
                                  {catDef ? (
                                    catDef.icon(styles.fixedCatIcon)
                                  ) : (
                                    <IconSparkles
                                      width={16}
                                      height={16}
                                      className={styles.fixedCatIcon}
                                    />
                                  )}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null
          ) : (
            /* ============================================================ */
            /* STATE A: ALL CATEGORIES + ALL TESTS (DEFAULT OVERVIEW) */
            /* ============================================================ */
            filteredOverviewModels.length === 0 ? (
              <EmptyState>
                <p>Модели не найдены по запросу «{modelSearchQuery}».</p>
              </EmptyState>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={`${styles.headerRow} ${styles.gridOverview}`}>
                      <th className={styles.thLeft} title="Позиция модели в текущей выборке">
                        Ранг
                      </th>
                      <th className={styles.thLeft}>Модель</th>
                      <th className={styles.thLeft}>Провайдер</th>
                      <th
                        className={`${styles.thCenter} ${styles.thSortable} ${
                          overviewSort.column === "coverage" ? styles.thSortActive : ""
                        }`}
                        onClick={() => handleToggleOverviewSort("coverage")}
                        role="button"
                        tabIndex={0}
                        aria-sort={
                          overviewSort.column === "coverage"
                            ? overviewSort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleOverviewSort("coverage");
                          }
                        }}
                        title="Сортировать по общему числу доступных результатов тестов"
                      >
                        <span className={styles.sortHeaderContent}>
                          Покрытие
                          <SortIndicator
                            active={overviewSort.column === "coverage"}
                            direction={overviewSort.direction}
                          />
                        </span>
                      </th>
                      <th
                        className={`${styles.thCenter} ${styles.thSortable} ${
                          overviewSort.column === "score" ? styles.thSortActive : ""
                        }`}
                        onClick={() => handleToggleOverviewSort("score")}
                        role="button"
                        tabIndex={0}
                        aria-sort={
                          overviewSort.column === "score"
                            ? overviewSort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleOverviewSort("score");
                          }
                        }}
                        title="Официальный агрегированный балл BenchLM (методология bench-align-v5). Кликните для сортировки."
                      >
                        <span className={styles.sortHeaderContent}>
                          <span
                            className={styles.thWithInfo}
                            title="Официальный агрегированный балл BenchLM (методология bench-align-v5), рассчитанный на основе верифицированных тестов."
                          >
                            BenchLM Score
                            <IconInfo width={12} height={12} className={styles.infoIcon} />
                          </span>
                          <SortIndicator
                            active={overviewSort.column === "score"}
                            direction={overviewSort.direction}
                          />
                        </span>
                      </th>
                      <th className={styles.thLeft}>
                        <span
                          className={styles.thWithInfo}
                          title={OVERVIEW_STRENGTHS_LEGEND}
                        >
                          Сильные стороны
                          <IconInfo width={12} height={12} className={styles.infoIcon} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOverviewModels.map((m, idx) => {
                      const localRank = idx + 1;
                      const isClickable = !!m.matchedModelId;

                      return (
                        <tr
                          key={m.modelKey}
                          className={`${styles.tableRow} ${styles.gridOverview} ${isClickable ? styles.clickableRow : ""}`}
                          onClick={() => handleOpenModel(m.matchedModelId)}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (isClickable && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleOpenModel(m.matchedModelId);
                            }
                          }}
                        >
                          <td className={styles.rankCell}>
                            <span
                              className={`${styles.rankBadge} ${
                                localRank === 1
                                  ? styles.rank1
                                  : localRank === 2
                                    ? styles.rank2
                                    : localRank === 3
                                      ? styles.rank3
                                      : ""
                              }`}
                            >
                              #{localRank}
                            </span>
                          </td>
                          <td>
                            <div className={styles.modelNameCell}>
                              <ProviderMark
                                provider={m.provider || m.creator}
                                modelName={m.modelName}
                                size={20}
                                className={styles.modelIcon}
                              />
                              <span
                                className={`${styles.modelNameText} ${
                                  m.matchedModelId ? styles.modelNameLinked : ""
                                }`}
                              >
                                {m.modelName}
                              </span>
                            </div>
                          </td>
                          <td className={styles.providerCell}>
                            {m.provider &&
                            knownProviders.has(m.provider.toLowerCase()) ? (
                              <span
                                className={styles.providerLink}
                                onClick={(e) => handleOpenProvider(e, m.provider)}
                                title={`Показать все модели ${m.provider}`}
                                role="button"
                                tabIndex={0}
                              >
                                {m.provider}
                              </span>
                            ) : (
                              <span className={styles.providerPlain}>
                                {m.provider || m.creator || "—"}
                              </span>
                            )}
                          </td>
                          <td
                            className={styles.coverageCell}
                            title={`Результаты доступны в ${m.coverageCount} из ${m.totalBenchmarksCount} тестов каталога.`}
                          >
                            <span className={styles.coverageNumerator}>
                              {m.coverageCount}
                            </span>
                            <span className={styles.coverageDenominator}>
                              {" "}
                              / {m.totalBenchmarksCount}
                            </span>
                          </td>
                          <td className={styles.scoreCell}>
                            {m.displayScore !== undefined ? formatScore(m.displayScore) : "—"}
                          </td>
                          <td className={styles.strengthsCell}>
                            <FixedOrderStrongSides scores={m.categoryScores} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          <footer className={styles.provenanceFooter}>
            <p>
              Данные и ранжирование предоставлены публичным зеркалом <strong>BenchLM</strong>.
              Оценки основаны на верифицированных испытаниях.
            </p>
          </footer>
        </section>
      )}
    </div>
  );
}

/**
 * Normalized Category Filter Dropdown (filters out raw tags like external, korean)
 */
function CategoryFilterDropdown({
  categories,
  selectedId,
  onSelect,
}: {
  categories: BenchmarkCategoryInfo[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Whitelist & normalize categories based on CANONICAL_CATEGORIES
  const displayCategories = useMemo(() => {
    const rawIdsInDataset = new Set(categories.map((c) => c.id.toLowerCase()));
    return CANONICAL_CATEGORIES.filter((canonical) =>
      canonical.rawKeys.some((k) => rawIdsInDataset.has(k)),
    );
  }, [categories]);

  const activeCanonical = CANONICAL_CATEGORIES.find((c) =>
    c.rawKeys.includes(selectedId.toLowerCase()),
  );

  const triggerLabel =
    selectedId === "all"
      ? "Все категории"
      : selectedId === "speed"
        ? "Скорость"
        : activeCanonical?.label || formatCategoryName(selectedId);

  const toggleDropdown = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 320 && rect.top > 320);
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={styles.dropdownWrap}>
      <button
        type="button"
        className={`${styles.triggerBtn} ${isOpen ? styles.triggerOpen : ""}`}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerText}>{triggerLabel}</span>
        <IconChevronDown width={13} height={13} className={styles.chevronIcon} />
      </button>

      {isOpen && (
        <div
          className={`${styles.popoverMenu} ${openUpwards ? styles.popoverUpwards : ""}`}
          role="listbox"
        >
          <ul className={styles.optionsList}>
            <li
              role="option"
              aria-selected={selectedId === "all"}
              className={`${styles.optionItem} ${selectedId === "all" ? styles.optionItemActive : ""}`}
              onClick={() => {
                onSelect("all");
                setIsOpen(false);
              }}
            >
              <div className={styles.optionItemContent}>
                <IconSparkles width={14} height={14} className={styles.catOptionIcon} />
                <span>Все категории</span>
              </div>
              {selectedId === "all" && (
                <IconCheck width={13} height={13} className={styles.checkIcon} />
              )}
            </li>

            {displayCategories.map((cat) => {
              const isSelected = selectedId.toLowerCase() === cat.id.toLowerCase();
              return (
                <li
                  key={cat.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.optionItem} ${isSelected ? styles.optionItemActive : ""}`}
                  onClick={() => {
                    onSelect(cat.id);
                    setIsOpen(false);
                  }}
                >
                  <div className={styles.optionItemContent}>
                    {cat.icon(styles.catOptionIcon)}
                    <span>{cat.label}</span>
                  </div>
                  {isSelected && (
                    <IconCheck width={13} height={13} className={styles.checkIcon} />
                  )}
                </li>
              );
            })}

            {/* Speed Category */}
            <li
              role="option"
              aria-selected={selectedId === "speed"}
              className={`${styles.optionItem} ${selectedId === "speed" ? styles.optionItemActive : ""}`}
              onClick={() => {
                onSelect("speed");
                setIsOpen(false);
              }}
            >
              <div className={styles.optionItemContent}>
                <IconGauge width={14} height={14} className={styles.catOptionIcon} />
                <span>Скорость</span>
              </div>
              {selectedId === "speed" && (
                <IconCheck width={13} height={13} className={styles.checkIcon} />
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable Benchmark Filter Dropdown with model coverage filtering and "Показать редкие тесты" toggle
 */
function BenchmarkFilterDropdown({
  benchmarks,
  selectedId,
  onSelect,
}: {
  benchmarks: Benchmark[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [query, setQuery] = useState("");
  const [showRareTests, setShowRareTests] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedBenchmark = benchmarks.find((b) => b.id === selectedId);
  const triggerLabel = selectedBenchmark ? selectedBenchmark.name : "Все тесты";

  // Hide benchmarks with 0 results always; separate comparative (>= 3) and rare (1-2)
  const { comparativeList, rareList } = useMemo(() => {
    const validBenchmarks = benchmarks.filter((b) => (b.resultCount || 0) > 0);
    const q = query.trim().toLowerCase();

    const filtered = q
      ? validBenchmarks.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            (b.fullName && b.fullName.toLowerCase().includes(q)),
        )
      : validBenchmarks;

    const comparative = filtered.filter((b) => b.resultCount >= 3);
    const rare = filtered.filter((b) => b.resultCount >= 1 && b.resultCount <= 2);

    return { comparativeList: comparative, rareList: rare };
  }, [benchmarks, query]);

  const toggleDropdown = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 370 && rect.top > 370);
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={styles.dropdownWrap}>
      <button
        type="button"
        className={`${styles.triggerBtn} ${isOpen ? styles.triggerOpen : ""}`}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerText}>{triggerLabel}</span>
        <IconChevronDown width={13} height={13} className={styles.chevronIcon} />
      </button>

      {isOpen && (
        <div
          className={`${styles.popoverMenu} ${styles.benchmarkPopover} ${
            openUpwards ? styles.popoverUpwards : ""
          }`}
          role="presentation"
        >
          <div className={styles.dropdownSearchHeader}>
            <IconSearch width={13} height={13} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="search"
              className={styles.dropdownSearchInput}
              placeholder="Найти тест..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <ul className={styles.optionsList} role="listbox">
            {/* "Все тесты" item */}
            {!query && (
              <li
                role="option"
                aria-selected={!selectedId}
                className={`${styles.optionItem} ${!selectedId ? styles.optionItemActive : ""}`}
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                  setQuery("");
                }}
              >
                <span className={styles.optionName}>Все тесты</span>
                {!selectedId && (
                  <IconCheck width={13} height={13} className={styles.checkIcon} />
                )}
              </li>
            )}

            {comparativeList.length === 0 && (!showRareTests || rareList.length === 0) ? (
              <li className={styles.dropdownEmpty}>Ничего не найдено</li>
            ) : (
              <>
                {/* Comparative benchmarks (>= 3 models) */}
                {comparativeList.map((b) => {
                  const isSelected = b.id === selectedId;
                  return (
                    <li
                      key={b.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`${styles.optionItem} ${isSelected ? styles.optionItemActive : ""}`}
                      onClick={() => {
                        onSelect(b.id);
                        setIsOpen(false);
                        setQuery("");
                      }}
                      title={b.fullName || b.name}
                    >
                      <span className={styles.optionName}>{b.name}</span>
                      <span
                        className={styles.optionCount}
                        title={`${b.resultCount} ${pluralizeModels(b.resultCount)} с результатами`}
                      >
                        {b.resultCount}
                      </span>
                    </li>
                  );
                })}

                {/* Rare benchmarks (1-2 models) shown only if enabled */}
                {showRareTests && rareList.length > 0 && (
                  <>
                    <li className={styles.dropdownDividerRow}>
                      <span>Мало данных (1–2 модели)</span>
                    </li>
                    {rareList.map((b) => {
                      const isSelected = b.id === selectedId;
                      return (
                        <li
                          key={b.id}
                          role="option"
                          aria-selected={isSelected}
                          className={`${styles.optionItem} ${styles.rareOptionItem} ${
                            isSelected ? styles.optionItemActive : ""
                          }`}
                          onClick={() => {
                            onSelect(b.id);
                            setIsOpen(false);
                            setQuery("");
                          }}
                          title={b.fullName || b.name}
                        >
                          <span className={styles.optionName}>{b.name}</span>
                          <span
                            className={styles.optionCount}
                            title={`${b.resultCount} ${pluralizeModels(b.resultCount)} с результатами`}
                          >
                            {b.resultCount}
                          </span>
                        </li>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </ul>

          {/* Secondary footer toggle for rare tests */}
          {rareList.length > 0 && (
            <div className={styles.dropdownFooterToggle}>
              <button
                type="button"
                className={styles.rareToggleBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRareTests((prev) => !prev);
                }}
              >
                <span>{showRareTests ? "Скрыть редкие тесты" : "Показать редкие тесты (1–2 модели)"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const OVERVIEW_STRENGTHS_LEGEND = `Порядок категорий (слева направо):
1. Knowledge (Знания)
2. Coding (Программирование)
3. Reasoning (Рассуждения)
4. Instruction Following (Следование инструкциям)
5. Agentic (Агентность)
6. Multimodal & Grounded (Мультимодальность)
7. Mathematics (Математика)
8. Multilingual (Мультиязычность)

Шкала оценок:
• Акцентный teal (≥85) — высокий результат
• Нейтральный (70–84.9) — хороший / средний
• Приглушённый оранжевый (50–69.9) — ниже среднего
• Приглушённый красный (<50) — низкий
• Серый — нет данных`;

/**
 * Fixed Order Category Slots with score color coding and missing data indicator
 */
function FixedOrderStrongSides({
  scores,
}: {
  scores?: Record<string, number>;
}) {
  const normScores = useMemo(() => {
    const map = new Map<string, number>();
    for (const [key, val] of Object.entries(scores || {})) {
      if (typeof val === "number" && !isNaN(val)) {
        map.set(key.toLowerCase().replace(/_/g, ""), val);
      }
    }
    return map;
  }, [scores]);

  return (
    <div className={styles.strengthsIconsRow}>
      {CANONICAL_CATEGORIES.map((canonical) => {
        let score: number | undefined;
        for (const rawKey of canonical.rawKeys) {
          const s = normScores.get(rawKey.toLowerCase().replace(/_/g, ""));
          if (s !== undefined) {
            score = s;
            break;
          }
        }

        const hasData = score !== undefined && !isNaN(score);
        const colorClass = getScoreColorClass(score);
        const tooltipText = hasData
          ? `${canonical.label} · ${score!.toFixed(1)}`
          : `${canonical.label} · нет данных`;

        return (
          <span
            key={canonical.id}
            className={`${styles.strengthSlot} ${colorClass} ${!hasData ? styles.slotMissing : ""}`}
            title={tooltipText}
            aria-label={tooltipText}
          >
            {canonical.icon(styles.fixedCatIcon)}
          </span>
        );
      })}
    </div>
  );
}

function getScoreColorClass(score: number | undefined | null): string {
  if (score === undefined || score === null || isNaN(score)) return styles.scoreNone;
  if (score >= 85) return styles.scoreStrong; // strong teal/green (85-100)
  if (score >= 70) return styles.scoreGood;   // muted yellow (70-84.9)
  if (score >= 50) return styles.scoreMedium; // muted orange (50-69.9)
  return styles.scorePoor;                    // muted red (0-49.9)
}

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || typeof value !== "number" || isNaN(value)) {
    return "—";
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value < 2 ? 2 : 1);
}

function formatCategoryName(key: string): string {
  const norm = key.toLowerCase();
  for (const canonical of CANONICAL_CATEGORIES) {
    if (canonical.rawKeys.some((k) => k.toLowerCase() === norm)) {
      return canonical.label;
    }
  }
  if (norm === "speed") return "Скорость";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function pluralizeModels(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "моделей";
  if (mod10 === 1) return "модель";
  if (mod10 >= 2 && mod10 <= 4) return "модели";
  return "моделей";
}
