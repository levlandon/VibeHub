import { useState } from "react";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark } from "../../components/icons";
import { BENCHMARKS } from "../../data/benchmarks";
import { postsForEntity } from "../../services/posts";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { CatalogKind } from "../../types/entities";
import type { Model, Tool } from "../../types/hub";
import { ENTITY_TABS } from "./entityTabs";
import { ModelHeader } from "./components/ModelHeader";
import { RelatedPosts } from "./RelatedPosts";
import styles from "./EntityPage.module.css";

export function EntityPage() {
  const {
    entityView,
    models,
    modelsLoading,
    tools,
    posts,
    savedItems,
    setEntityView,
    toggleSavedTarget,
  } = useHub();

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
          ← К списку
        </button>
        <p className={styles.descriptionEmpty}>
          {loading
            ? "Загружаем каталог моделей…"
            : "Сущность не найдена. Возможно, ссылка устарела."}
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
  const tabs = ENTITY_TABS[kind];
  const [tab, setTab] = useState(tabs[0].id);
  const rows = model ? BENCHMARKS.filter((row) => row.modelId === model.id) : [];

  const tabPosts =
    tab === "guides"
      ? related.filter((p) => p.type === "guide")
      : tab === "discussions"
        ? related.filter((p) => p.type === "discussion" || p.type === "question")
        : related;

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← К списку
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
              label={saved ? "Убрать из закладок" : "Сохранить"}
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
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className={styles.block}>
          {!model && tool ? (
            <>
              <div className={styles.toolDescription}>
                <p>{tool.summary ?? "Карточка инструмента в каталоге VibeHub."}</p>
              </div>
              <div className={styles.toolSpecsGrid}>
                <div className={styles.toolSpecCard}>
                  <h3 className={styles.toolSpecTitle}>Тип</h3>
                  <p className={styles.toolSpecValue}>{tool.typeLabel}</p>
                </div>
                <div className={styles.toolSpecCard}>
                  <h3 className={styles.toolSpecTitle}>Совместимость</h3>
                  <p className={styles.toolSpecValue}>{tool.compatibility.join(" · ")}</p>
                </div>
              </div>
            </>
          ) : null}

          {/* Benchmarks summary in Overview if present for this model */}
          {model && rows.length > 0 ? (
            <div className={styles.overviewBenchmarks}>
              <h3 className={styles.overviewSectionTitle}>Проверенные бенчмарки</h3>
              <div className={styles.benchmarkList}>
                {rows.map((row) => (
                  <div key={row.id} className={styles.benchmarkRow}>
                    <span className={styles.benchmarkName}>{row.benchmark}</span>
                    <span className={styles.benchmarkScore}>
                      {row.score}
                      {row.scoreMax ? ` / ${row.scoreMax}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Related posts in Overview only if they actually exist (no empty state) */}
          {related.length > 0 ? (
            <div className={styles.overviewSection}>
              <h3 className={styles.overviewSectionTitle}>Связанные материалы</h3>
              <RelatedPosts posts={related} />
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "benchmarks" ? (
        <section className={styles.block}>
          {rows.length === 0 ? (
            <p className={styles.emptyNotice}>Нет проверенных бенчмарков для этой модели.</p>
          ) : (
            <div className={styles.benchmarkList}>
              {rows.map((row) => (
                <div key={row.id} className={styles.benchmarkRow}>
                  <span className={styles.benchmarkName}>{row.benchmark}</span>
                  <span className={styles.benchmarkScore}>
                    {row.score}
                    {row.scoreMax ? ` / ${row.scoreMax}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
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

