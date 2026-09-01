import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark, IconChevron } from "../../components/icons";
import {
  benchmarkService,
  type ModelBenchmarkScore,
  type ModelSpeedMetric,
} from "../../services/benchmarks";
import { postsForEntity } from "../../services/posts";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import { usePosts } from "../posts";
import type { CatalogKind } from "../../types/entities";
import type { Model, Tool } from "../../types/hub";
import { ENTITY_TABS } from "./entityTabs";
import { ModelHeader } from "./components/ModelHeader";
import { RelatedPosts } from "./RelatedPosts";
import styles from "./EntityPage.module.css";
import { useI18n } from "../../i18n";

export function EntityPage() {
  const { t } = useI18n();
  const {
    entityView,
    models,
    modelsLoading,
    tools,
    savedItems,
    setEntityView,
    toggleSavedTarget,
  } = useHub();
  const { posts } = usePosts();

  if (!entityView || (entityView.kind !== "model" && entityView.kind !== "tool")) {
    return null;
  }

  const kind = entityView.kind as CatalogKind;
  const model = kind === "model" ? models.find((m) => m.id === entityView.id) : undefined;
  const tool = kind === "tool" ? tools.find((t) => t.id === entityView.id) : undefined;
  const title = model?.name ?? tool?.name;

  if (!title) {
    const loading = kind === "model" && modelsLoading;
    return (
      <div className={styles.page}>
        <button type="button" className={styles.back} onClick={() => setEntityView(null)}>
          ← {t("common.back")}
        </button>
        <p className={styles.descriptionEmpty}>
          {loading
            ? t("models.loading")
            : t("entity.notFound")}
        </p>
      </div>
    );
  }

  const saved = isSaved(savedItems, kind, entityView.id);

  return (
    <EntityPageView
      key={`${kind}-${entityView.id}`}
      kind={kind}
      title={title}
      model={model}
      tool={tool}
      related={postsForEntity(posts, kind, entityView.id)}
      onBack={() => setEntityView(null)}
      onSave={() =>
        toggleSavedTarget({
          kind,
          targetId: entityView.id,
          title,
          subtitle: model?.provider ?? tool?.typeLabel,
        })
      }
      saved={saved}
    />
  );
}

function EntityPageView({
  kind,
  title,
  model,
  tool,
  related,
  onBack,
  onSave,
  saved,
}: {
  kind: CatalogKind;
  title: string;
  model?: Model;
  tool?: Tool;
  related: ReturnType<typeof postsForEntity>;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const tabs = ENTITY_TABS[kind];
  const [tab, setTab] = useState(tabs[0].id);

  const [benchmarkScores, setBenchmarkScores] = useState<ModelBenchmarkScore[]>([]);
  const [speedMetric, setSpeedMetric] = useState<ModelSpeedMetric | null>(null);

  useEffect(() => {
    if (!model) return;
    let isMounted = true;

    Promise.all([
      benchmarkService.getModelBenchmarkScores(model),
      benchmarkService.getModelSpeed(model),
    ])
      .then(([scores, speed]) => {
        if (isMounted) {
          setBenchmarkScores(scores);
          setSpeedMetric(speed);
        }
      })
      .catch((err) => {
        console.warn("Failed to load model benchmarks:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [model]);

  const tabPosts =
    tab === "guides"
      ? related.filter((p) => p.type === "guide")
      : tab === "discussions"
        ? related.filter((p) => p.type === "discussion" || p.type === "question")
        : related;

  const handleOpenBenchmark = (benchmarkId: string) => {
    navigate({ to: `/benchmarks/${encodeURIComponent(benchmarkId)}` });
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t("common.back")}
      </button>

      {model ? (
        <ModelHeader model={model} saved={saved} onSave={onSave} />
      ) : (
        <header className={styles.toolHead}>
          <div className={styles.toolHeadMain}>
            <div>
              <h1 className={styles.headTitle}>{title}</h1>
              <p className={styles.headSubtitle}>{tool?.typeLabel}</p>
            </div>
          </div>
          <div className={styles.headActions}>
            <IconButton
              label={saved ? t("saved.removeBookmark") : t("common.save")}
              active={saved}
              onClick={onSave}
            >
              <IconBookmark width={18} height={18} />
            </IconButton>
          </div>
        </header>
      )}

      <div className={styles.tabs}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === tab ? styles.on : undefined}
            onClick={() => setTab(item.id)}
          >
            {t(`entity.tab.${item.id}`)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className={styles.block}>
          {!model && tool ? (
            <>
              <div className={styles.toolDescription}>
                <p>{tool.summary ?? t("entity.toolFallback")}</p>
              </div>
              <div className={styles.toolSpecsGrid}>
                <div className={styles.toolSpecCard}>
                  <h3 className={styles.toolSpecTitle}>{t("tools.type")}</h3>
                  <p className={styles.toolSpecValue}>{tool.typeLabel}</p>
                </div>
                <div className={styles.toolSpecCard}>
                  <h3 className={styles.toolSpecTitle}>{t("entity.compatibility")}</h3>
                  <p className={styles.toolSpecValue}>{tool.compatibility.join(" · ")}</p>
                </div>
              </div>
            </>
          ) : null}

          {/* Benchmarks summary in Overview if present for this model */}
          {model && benchmarkScores.length > 0 ? (
            <div className={styles.overviewBenchmarks}>
              <h3 className={styles.overviewSectionTitle}>{t("entity.verifiedBenchmarks")}</h3>
              <div className={styles.benchmarkList}>
                {benchmarkScores.slice(0, 6).map((score) => (
                  <div
                    key={score.benchmarkId}
                    className={`${styles.benchmarkRow} ${styles.clickableRow}`}
                    onClick={() => handleOpenBenchmark(score.benchmarkId)}
                  >
                    <div className={styles.benchmarkTitleGroup}>
                      <span className={styles.benchmarkName}>{score.benchmarkName}</span>
                      <span className={styles.benchmarkCategoryBadge}>{score.categoryLabel}</span>
                    </div>
                    <div className={styles.benchmarkScoreGroup}>
                      <span className={styles.benchmarkScore}>{formatScore(score.score)}</span>
                      <IconChevron width={14} height={14} className={styles.rowChevron} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Speed summary in Overview if present */}
          {model && speedMetric ? (
            <div className={styles.overviewBenchmarks}>
              <h3 className={styles.overviewSectionTitle}>{t("entity.inferenceSpeed")}</h3>
              <div className={styles.speedGrid}>
                <div className={styles.speedCard}>
                  <span className={styles.speedCardLabel}>{t("entity.throughput")}</span>
                  <span className={styles.speedCardValue}>
                    {speedMetric.tokensPerSecond} <small>{t("entity.tokensPerSecond")}</small>
                  </span>
                </div>
                {typeof speedMetric.ttft === "number" && !isNaN(speedMetric.ttft) ? (
                  <div className={styles.speedCard}>
                    <span className={styles.speedCardLabel}>{t("entity.latency")}</span>
                    <span className={styles.speedCardValue}>
                      {speedMetric.ttft.toFixed(2)}s
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Related posts in Overview only if they actually exist (no empty state) */}
          {related.length > 0 ? (
            <div className={styles.overviewSection}>
              <h3 className={styles.overviewSectionTitle}>{t("entity.related")}</h3>
              <RelatedPosts posts={related} />
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "benchmarks" ? (
        <section className={styles.block}>
          {speedMetric ? (
            <div className={styles.speedSectionBox}>
              <h3 className={styles.overviewSectionTitle}>{t("entity.modelSpeed")}</h3>
              <div className={styles.speedGrid}>
                <div className={styles.speedCard}>
                  <span className={styles.speedCardLabel}>{t("entity.throughput")}</span>
                  <span className={styles.speedCardValue}>
                    {speedMetric.tokensPerSecond} <small>{t("entity.tokensPerSecond")}</small>
                  </span>
                </div>
                {typeof speedMetric.ttft === "number" && !isNaN(speedMetric.ttft) ? (
                  <div className={styles.speedCard}>
                    <span className={styles.speedCardLabel}>{t("entity.timeToFirstToken")}</span>
                    <span className={styles.speedCardValue}>
                      {speedMetric.ttft.toFixed(2)}s
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {benchmarkScores.length === 0 && !speedMetric ? (
            <p className={styles.emptyNotice}>
              {t("entity.noBenchmarks")}
            </p>
          ) : benchmarkScores.length > 0 ? (
            <div>
              <h3 className={styles.overviewSectionTitle}>
                {t("entity.benchmarkResults", { count: benchmarkScores.length })}
              </h3>
              <div className={styles.benchmarkList}>
                {benchmarkScores.map((score) => (
                  <div
                    key={score.benchmarkId}
                    className={`${styles.benchmarkRow} ${styles.clickableRow}`}
                    onClick={() => handleOpenBenchmark(score.benchmarkId)}
                  >
                    <div className={styles.benchmarkTitleGroup}>
                      <span className={styles.benchmarkName}>{score.benchmarkName}</span>
                      <span className={styles.benchmarkCategoryBadge}>{score.categoryLabel}</span>
                    </div>
                    <div className={styles.benchmarkScoreGroup}>
                      <span className={styles.benchmarkScore}>{formatScore(score.score)}</span>
                      <IconChevron width={14} height={14} className={styles.rowChevron} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "discussions" || tab === "guides" ? (
        <section className={styles.block}>
          <RelatedPosts posts={tabPosts} />
        </section>
      ) : null}
    </div>
  );
}

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || typeof value !== "number" || isNaN(value)) {
    return "—";
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value < 2 ? 2 : 1);
}
