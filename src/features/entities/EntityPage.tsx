import { useState } from "react";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark } from "../../components/icons";
import { ProviderMark } from "../../components/ProviderMark/ProviderMark";
import { BENCHMARKS } from "../../data/benchmarks";
import { postsForEntity } from "../../services/posts";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { CatalogKind } from "../../types/entities";
import type { Model, Tool } from "../../types/hub";
import styles from "./EntityPage.module.css";
import { ENTITY_TABS } from "./entityTabs";
import { RelatedPosts } from "./RelatedPosts";

export function EntityPage() {
  const { entityView, models, tools, posts, savedItems, setEntityView, toggleSavedTarget } =
    useHub();

  if (!entityView || (entityView.kind !== "model" && entityView.kind !== "tool")) {
    return null;
  }

  const kind = entityView.kind as CatalogKind;
  const model = kind === "model" ? models.find((m) => m.id === entityView.id) : undefined;
  const tool = kind === "tool" ? tools.find((t) => t.id === entityView.id) : undefined;
  const title = model?.name ?? tool?.name;
  if (!title) return null;

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
  const rows = model
    ? BENCHMARKS.filter((row) => row.modelId === model.id)
    : [];

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

      <header className={styles.head}>
        <div className={styles.headMain}>
          {model ? <ProviderMark model={model} size={48} /> : null}
          <div>
            <h1 className={styles.headTitle}>{title}</h1>
            <p className={styles.headSubtitle}>{model?.provider ?? tool?.typeLabel}</p>
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
          {model ? (
            <>
              <div className={styles.description}>
                {model.description ? (
                  <p>{model.description}</p>
                ) : (
                  <p className={styles.descriptionEmpty}>
                    Описание модели отсутствует в спецификации провайдера.
                  </p>
                )}
              </div>

              <div className={styles.specsGrid}>
                <div className={styles.specCard}>
                  <h3 className={styles.specTitle}>Контекстное окно</h3>
                  <p className={`${styles.specValue} ${styles.specValueMono}`}>
                    {model.contextWindow}
                  </p>
                  <p className={styles.specSub}>
                    {model.contextLength.toLocaleString()} токенов
                  </p>
                </div>

                <div className={styles.specCard}>
                  <h3 className={styles.specTitle}>Ценообразование</h3>
                  <p className={`${styles.specValue} ${styles.specValueMono}`}>
                    {model.pricing.formattedSummary}
                  </p>
                  <p className={styles.specSub}>
                    {model.pricing.isFree
                      ? "Бесплатный уровень (Free)"
                      : `Prompt: $${model.pricing.promptPerMillion.toFixed(2)}/1M · Completion: $${model.pricing.completionPerMillion.toFixed(2)}/1M`}
                  </p>
                </div>

                <div className={styles.specCard}>
                  <h3 className={styles.specTitle}>Возможности</h3>
                  <div className={styles.badges}>
                    {model.capabilities.length > 0 ? (
                      model.capabilities.map((cap) => (
                        <span key={cap} className={styles.badge}>
                          {cap}
                        </span>
                      ))
                    ) : (
                      <span className={styles.specSub}>Стандартные (текст)</span>
                    )}
                  </div>
                </div>

                <div className={styles.specCard}>
                  <h3 className={styles.specTitle}>Модальность</h3>
                  <p className={styles.specValue}>
                    {model.architecture?.modality || "text->text"}
                  </p>
                  {model.architecture?.tokenizer ? (
                    <p className={styles.specSub}>
                      Токенизатор: {model.architecture.tokenizer}
                    </p>
                  ) : null}
                </div>

                {model.huggingFaceId ? (
                  <div className={styles.specCard}>
                    <h3 className={styles.specTitle}>Hugging Face</h3>
                    <p className={styles.specValue}>
                      <a
                        href={`https://huggingface.co/${model.huggingFaceId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        {model.huggingFaceId} ↗
                      </a>
                    </p>
                  </div>
                ) : null}

                <div className={styles.specCard}>
                  <h3 className={styles.specTitle}>Первоисточник</h3>
                  <p className={styles.specValue}>
                    <a
                      href={model.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      OpenRouter API ↗
                    </a>
                  </p>
                  {model.releaseDate ? (
                    <p className={styles.specSub}>
                      Добавлено: {model.releaseDate}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.description}>
                <p>{tool?.summary ?? "Карточка инструмента в каталоге VibeHub."}</p>
              </div>
              <div className={styles.specsGrid}>
                <div className={styles.specCard}>
                  <h3 className={styles.specTitle}>Тип</h3>
                  <p className={styles.specValue}>{tool?.typeLabel}</p>
                </div>
                <div className={styles.specCard}>
                  <h3 className={styles.specTitle}>Совместимость</h3>
                  <p className={styles.specValue}>{tool?.compatibility.join(" · ")}</p>
                </div>
              </div>
            </>
          )}

          <RelatedPosts posts={related} />
        </section>
      ) : null}

      {tab === "benchmarks" ? (
        <section className={styles.block}>
          {rows.length === 0 ? (
            <p className={styles.row}>Нет проверенных бенчмарков для этой сущности.</p>
          ) : (
            rows.map((row) => (
              <p key={row.id} className={styles.row}>
                {row.benchmark} · {row.score}
                {row.scoreMax ? `/${row.scoreMax}` : ""}
              </p>
            ))
          )}
        </section>
      ) : null}

      {tab === "discussions" || tab === "guides" ? (
        <RelatedPosts posts={tabPosts} />
      ) : null}
    </div>
  );
}
