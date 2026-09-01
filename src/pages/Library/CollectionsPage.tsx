import { useEffect, useState } from "react";
import { AddWebsiteModal } from "../../components/AddWebsiteModal/AddWebsiteModal";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { CreateCollectionModal } from "../../components/CreateCollectionModal/CreateCollectionModal";
import { IconButton } from "../../components/IconButton/IconButton";
import {
  IconCollections,
  IconEdit,
  IconMore,
  IconMove,
  IconOpen,
  IconPlus,
  IconSparkles,
  IconTrash,
} from "../../components/icons";
import { MoveWebsiteModal } from "../../components/MoveWebsiteModal/MoveWebsiteModal";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { QuickAccess } from "../../components/QuickAccess/QuickAccess";
import { CollectionsGridSkeleton } from "../../components/Skeleton";
import { SiteIcon } from "../../components/SiteIcon/SiteIcon";
import { useCollections } from "../../hooks/useCollections";
import { useI18n } from "../../i18n";
import type {
  Collection,
  CollectionItem,
  CreateCollectionItemInput,
} from "../../types/collections";
import styles from "./Collections.module.css";

function formatItemsCount(
  count: number,
  language: "ru" | "en",
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (language === "en") {
    return t(count === 1 ? "collections.items.one" : "collections.items.other", { count });
  }

  if (count % 10 === 1 && count % 100 !== 11) {
    return t("collections.items.one", { count });
  }
  if (
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 10 || count % 100 >= 20)
  ) {
    return t("collections.items.few", { count });
  }
  return t("collections.items.many", { count });
}

const DEFAULT_COLLECTION_COPY: Record<
  string,
  { source: string; key: string }
> = {
  "col-assistants": {
    source: "Веб-интерфейсы и чат-ассистенты для ежедневной работы",
    key: "collections.default.assistantsDescription",
  },
  "col-coding": {
    source: "Инструменты для vibe coding, генерации кода и агентов",
    key: "collections.default.codingDescription",
  },
  "col-research": {
    source: "Датасеты, открытые веса, бенчмарки и анализ",
    key: "collections.default.researchDescription",
  },
};

const DEFAULT_ITEM_COPY: Record<string, { source: string; key: string }> = {
  "item-openrouter": {
    source: "Единый API и чат для доступа ко всем LLM",
    key: "collections.default.openrouterDescription",
  },
  "item-claude": {
    source: "Ассистент от Anthropic с артефактами и проектами",
    key: "collections.default.claudeDescription",
  },
  "item-chatgpt": {
    source: "Модели OpenAI GPT-4o и o3",
    key: "collections.default.chatgptDescription",
  },
  "item-v0": {
    source: "Генеративный UI и фронтенд-компоненты",
    key: "collections.default.v0Description",
  },
  "item-cursor": {
    source: "AI-first редактор кода",
    key: "collections.default.cursorDescription",
  },
  "item-bolt": {
    source: "In-browser web development агент",
    key: "collections.default.boltDescription",
  },
  "item-hf": {
    source: "Хаб моделей, датасетов и спейсов",
    key: "collections.default.huggingfaceDescription",
  },
  "item-aa": {
    source: "Независимые бенчмарки скорости, цены и качества моделей",
    key: "collections.default.analysisDescription",
  },
};

function localizeDefaultCollectionDescription(
  collection: Collection,
  t: (key: string) => string,
): string | undefined {
  const copy = DEFAULT_COLLECTION_COPY[collection.id];
  return copy && collection.description === copy.source
    ? t(copy.key)
    : collection.description;
}

function localizeDefaultItemDescription(
  item: CollectionItem,
  t: (key: string) => string,
): string | undefined {
  const copy = DEFAULT_ITEM_COPY[item.id];
  return copy && item.description === copy.source ? t(copy.key) : item.description;
}

interface CollectionsPageProps {
  showHeader?: boolean;
}

export function CollectionsPage({ showHeader = true }: CollectionsPageProps) {
  const { language, t } = useI18n();
  const {
    collections,
    loading,
    activeCollection,
    setActiveCollectionId,
    createCollection,
    updateCollection,
    deleteCollection,
    addItem,
    removeItem,
    moveItem,
  } = useCollections();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editCollectionTarget, setEditCollectionTarget] = useState<Collection | null>(null);
  const [addSiteModalCollectionId, setAddSiteModalCollectionId] = useState<string | null>(null);
  const [deleteConfirmCollection, setDeleteConfirmCollection] = useState<Collection | null>(null);
  const [deleteConfirmActive, setDeleteConfirmActive] = useState(false);
  const [openMenuCollectionId, setOpenMenuCollectionId] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [addQuickAccessOpen, setAddQuickAccessOpen] = useState(false);

  const [moveModalItem, setMoveModalItem] = useState<{
    item: CollectionItem;
    fromCollectionId: string;
  } | null>(null);

  // Close context menu / plus menu on outside click or escape
  useEffect(() => {
    if (!openMenuCollectionId && !plusMenuOpen) return;
    const handleDocClick = () => {
      setOpenMenuCollectionId(null);
      setPlusMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuCollectionId(null);
        setPlusMenuOpen(false);
      }
    };
    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenuCollectionId, plusMenuOpen]);

  const handleAddSite = async (
    collectionId: string,
    input: CreateCollectionItemInput,
  ) => {
    await addItem(collectionId, input);
    setAddSiteModalCollectionId(null);
  };

  const handleCreateCollection = async (input: {
    name: string;
    description?: string;
  }) => {
    const created = await createCollection(input);
    setCreateModalOpen(false);
    setActiveCollectionId(created.id);
  };

  const handleEditCollection = async (input: {
    name: string;
    description?: string;
  }) => {
    if (!editCollectionTarget) return;
    await updateCollection(editCollectionTarget.id, input);
    setEditCollectionTarget(null);
  };

  const handleMoveSite = async (toCollectionId: string) => {
    if (!moveModalItem) return;
    await moveItem(
      moveModalItem.fromCollectionId,
      toCollectionId,
      moveModalItem.item.id,
    );
    setMoveModalItem(null);
  };

  const renderPlusButton = () => (
    <div className={styles.plusWrap} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`${styles.plusBtn} ${plusMenuOpen ? styles.plusBtnActive : ""}`}
        title={t("collections.add")}
        aria-label={t("collections.add")}
        aria-expanded={plusMenuOpen}
        onClick={() => setPlusMenuOpen((prev) => !prev)}
      >
        <IconPlus width={18} height={18} />
      </button>

      {plusMenuOpen ? (
        <div className={styles.headerDropdown} role="menu">
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              setPlusMenuOpen(false);
              setCreateModalOpen(true);
            }}
          >
            <IconCollections width={16} height={16} />
            <span>{t("collections.create")}</span>
          </button>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              setPlusMenuOpen(false);
              if (collections.length === 0) {
                setCreateModalOpen(true);
              } else {
                setAddSiteModalCollectionId(collections[0].id);
              }
            }}
          >
            <IconOpen width={16} height={16} />
            <span>{t("collections.addSite")}</span>
          </button>
          <button
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => {
              setPlusMenuOpen(false);
              setAddQuickAccessOpen(true);
            }}
          >
            <IconSparkles width={16} height={16} />
            <span>{t("collections.addToQuickAccess")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );

  // Detail View of a specific Collection
  if (activeCollection) {
    return (
      <div className={styles.page}>
        <div className={styles.detailHeader}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => setActiveCollectionId(null)}
          >
            ← {t("collections.backToAll")}
          </button>

          <div className={styles.detailHeadRow}>
            <div>
              <h1 className={styles.detailTitle}>{activeCollection.name}</h1>
              {localizeDefaultCollectionDescription(activeCollection, t) ? (
                <p className={styles.detailDesc}>
                  {localizeDefaultCollectionDescription(activeCollection, t)}
                </p>
              ) : null}
            </div>
            <div className={styles.detailActions}>
              <Button
                variant="primary"
                onClick={() => setAddSiteModalCollectionId(activeCollection.id)}
              >
                + {t("collections.addSite")}
              </Button>
              <IconButton
                label={t("collections.editTitle")}
                onClick={() => setEditCollectionTarget(activeCollection)}
              >
                <IconEdit width={16} height={16} />
              </IconButton>
              <IconButton
                label={t("collections.deleteCollection")}
                onClick={() => setDeleteConfirmActive(true)}
              >
                <IconTrash width={16} height={16} />
              </IconButton>
            </div>
          </div>
        </div>

        {activeCollection.items.length === 0 ? (
          <div className={styles.emptyBlock}>
            <p>{t("collections.empty")}</p>
            <Button
              variant="ghost"
              onClick={() => setAddSiteModalCollectionId(activeCollection.id)}
            >
              + {t("collections.addFirstSite")}
            </Button>
          </div>
        ) : (
          <ul className={styles.siteList}>
            {activeCollection.items.map((item) => (
              <li key={item.id}>
                <SiteRow
                  item={item}
                  onMove={() =>
                    setMoveModalItem({
                      item,
                      fromCollectionId: activeCollection.id,
                    })
                  }
                  onDelete={() => removeItem(activeCollection.id, item.id)}
                />
              </li>
            ))}
          </ul>
        )}

        <AddWebsiteModal
          isOpen={Boolean(addSiteModalCollectionId)}
          onClose={() => setAddSiteModalCollectionId(null)}
          onSave={handleAddSite}
          collections={collections}
          defaultCollectionId={addSiteModalCollectionId || activeCollection.id}
        />

        {editCollectionTarget ? (
          <CreateCollectionModal
            isOpen={Boolean(editCollectionTarget)}
            onClose={() => setEditCollectionTarget(null)}
            onSave={handleEditCollection}
            initialValues={{
              name: editCollectionTarget.name,
              description: localizeDefaultCollectionDescription(editCollectionTarget, t),
            }}
            modalTitle={t("collections.editTitle")}
          />
        ) : null}

        {deleteConfirmActive ? (
          <ConfirmDialog
            title={t("collections.deleteTitle", { name: activeCollection.name })}
            body={t("collections.deleteBody", { count: activeCollection.items.length })}
            cancelLabel={t("common.cancel")}
            confirmLabel={t("common.delete")}
            onCancel={() => setDeleteConfirmActive(false)}
            onConfirm={async () => {
              await deleteCollection(activeCollection.id);
              setDeleteConfirmActive(false);
            }}
          />
        ) : null}

        {moveModalItem ? (
          <MoveWebsiteModal
            isOpen={Boolean(moveModalItem)}
            onClose={() => setMoveModalItem(null)}
            itemTitle={moveModalItem.item.title}
            currentCollectionId={moveModalItem.fromCollectionId}
            collections={collections}
            onMove={handleMoveSite}
          />
        ) : null}
      </div>
    );
  }

  // Overview View: Quick Access + Collections Grid
  return (
    <div className={styles.page}>
      {showHeader ? (
        <PageHeader title={t("collections.title")}>
          <div className={styles.headerActions}>{renderPlusButton()}</div>
        </PageHeader>
      ) : null}

      <QuickAccess
        externalAddOpen={addQuickAccessOpen}
        onCloseExternalAdd={() => setAddQuickAccessOpen(false)}
      />

      <section aria-labelledby="collections-title">
        <div className={styles.sectionHeader}>
          <h2 id="collections-title" className={styles.sectionTitle}>
            {t("collections.my", { count: collections.length })}
          </h2>
          {!showHeader ? renderPlusButton() : null}
        </div>

        {loading && collections.length === 0 ? (
          <CollectionsGridSkeleton count={3} label={t("common.loadingCollections")} />
        ) : (
          <ul className={styles.collectionsGrid}>
            {collections.map((col) => (
            <li key={col.id}>
                <article
                className={styles.collectionCard}
                onClick={() => setActiveCollectionId(col.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveCollectionId(col.id);
                  }
                }}
              >
                <div>
                  <div className={styles.cardHead}>
                    <h3 className={styles.cardTitle}>{col.name}</h3>
                    <div
                      className={styles.menuWrap}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        label={t("collections.options")}
                        className={styles.menuTrigger}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuCollectionId((prev) =>
                            prev === col.id ? null : col.id,
                          );
                        }}
                      >
                        <IconMore width={16} height={16} />
                      </IconButton>

                      {openMenuCollectionId === col.id ? (
                        <div
                          className={styles.menuDropdown}
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={styles.menuItem}
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuCollectionId(null);
                              setAddSiteModalCollectionId(col.id);
                            }}
                          >
                            + {t("collections.addSite")}
                          </button>
                          <button
                            type="button"
                            className={styles.menuItem}
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuCollectionId(null);
                              setEditCollectionTarget(col);
                            }}
                          >
                            {t("collections.edit")}
                          </button>
                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuCollectionId(null);
                              setDeleteConfirmCollection(col);
                            }}
                          >
                            {t("collections.delete")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {localizeDefaultCollectionDescription(col, t) ? (
                    <p className={styles.cardDesc}>
                      {localizeDefaultCollectionDescription(col, t)}
                    </p>
                  ) : null}
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.cardCount}>
                    {formatItemsCount(col.items.length, language, t)}
                  </span>
                  <div className={styles.cardPreviews}>
                    {col.items.slice(0, 4).map((item) => (
                      <SitePreviewIcon key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
        )}
      </section>

      <AddWebsiteModal
        isOpen={Boolean(addSiteModalCollectionId)}
        onClose={() => setAddSiteModalCollectionId(null)}
        onSave={handleAddSite}
        collections={collections}
        defaultCollectionId={addSiteModalCollectionId || undefined}
      />

      <CreateCollectionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateCollection}
      />

      {editCollectionTarget ? (
        <CreateCollectionModal
          isOpen={Boolean(editCollectionTarget)}
          onClose={() => setEditCollectionTarget(null)}
          onSave={handleEditCollection}
          initialValues={{
            name: editCollectionTarget.name,
            description: localizeDefaultCollectionDescription(editCollectionTarget, t),
          }}
          modalTitle={t("collections.editTitle")}
        />
      ) : null}

      {deleteConfirmCollection ? (
        <ConfirmDialog
          title={t("collections.deleteTitle", { name: deleteConfirmCollection.name })}
          body={t("collections.deleteBody", { count: deleteConfirmCollection.items.length })}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("common.delete")}
          onCancel={() => setDeleteConfirmCollection(null)}
          onConfirm={async () => {
            await deleteCollection(deleteConfirmCollection.id);
            setDeleteConfirmCollection(null);
          }}
        />
      ) : null}

      {moveModalItem ? (
        <MoveWebsiteModal
          isOpen={Boolean(moveModalItem)}
          onClose={() => setMoveModalItem(null)}
          itemTitle={moveModalItem.item.title}
          currentCollectionId={moveModalItem.fromCollectionId}
          collections={collections}
          onMove={handleMoveSite}
        />
      ) : null}
    </div>
  );
}

function SitePreviewIcon({ item }: { item: CollectionItem }) {
  return (
    <SiteIcon
      src={item.favicon}
      domain={item.domain}
      fallbackText={item.title.slice(0, 1)}
      size={18}
      iconSize={18}
      radius={4}
    />
  );
}

function SiteRow({
  item,
  onMove,
  onDelete,
}: {
  item: CollectionItem;
  onMove: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const description = localizeDefaultItemDescription(item, t);
  return (
    <article className={styles.siteRow}>
      <SiteIcon
        src={item.favicon}
        domain={item.domain}
        fallbackText={item.title.slice(0, 2)}
        size={36}
        iconSize={22}
        radius={8}
      />

      <div className={styles.siteBody}>
        <a
          className={styles.siteTitleLink}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.title} ↗
        </a>
        <span className={styles.siteDomain}>{item.domain}</span>
        {description ? (
          <p className={styles.siteNote}>{description}</p>
        ) : null}
      </div>

      <div className={styles.siteActions}>
        <IconButton
          label={t("collections.move")}
          onClick={onMove}
        >
          <IconMove width={16} height={16} />
        </IconButton>
        <IconButton
          label={t("collections.remove")}
          onClick={onDelete}
        >
          <IconTrash width={16} height={16} />
        </IconButton>
      </div>
    </article>
  );
}
