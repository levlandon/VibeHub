import { useEffect, useState } from "react";
import { AddWebsiteModal } from "../../components/AddWebsiteModal/AddWebsiteModal";
import { Button } from "../../components/Button/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { CreateCollectionModal } from "../../components/CreateCollectionModal/CreateCollectionModal";
import { IconButton } from "../../components/IconButton/IconButton";
import {
  IconEdit,
  IconMore,
  IconMove,
  IconTrash,
} from "../../components/icons";
import { MoveWebsiteModal } from "../../components/MoveWebsiteModal/MoveWebsiteModal";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { QuickAccess } from "../../components/QuickAccess/QuickAccess";
import { SiteIcon } from "../../components/SiteIcon/SiteIcon";
import { useCollections } from "../../hooks/useCollections";
import type {
  Collection,
  CollectionItem,
  CreateCollectionItemInput,
} from "../../types/collections";
import styles from "./Collections.module.css";

function formatItemsCount(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) {
    return `${count} сайт`;
  }
  if (
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 10 || count % 100 >= 20)
  ) {
    return `${count} сайта`;
  }
  return `${count} сайтов`;
}

export function CollectionsPage() {
  const {
    collections,
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

  const [moveModalItem, setMoveModalItem] = useState<{
    item: CollectionItem;
    fromCollectionId: string;
  } | null>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!openMenuCollectionId) return;
    const handleDocClick = () => setOpenMenuCollectionId(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuCollectionId(null);
    };
    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenuCollectionId]);

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
            ← Ко всем коллекциям
          </button>

          <div className={styles.detailHeadRow}>
            <div>
              <h1 className={styles.detailTitle}>{activeCollection.name}</h1>
              {activeCollection.description ? (
                <p className={styles.detailDesc}>{activeCollection.description}</p>
              ) : null}
            </div>
            <div className={styles.detailActions}>
              <Button
                variant="primary"
                onClick={() => setAddSiteModalCollectionId(activeCollection.id)}
              >
                + Добавить сайт
              </Button>
              <IconButton
                label="Редактировать коллекцию"
                onClick={() => setEditCollectionTarget(activeCollection)}
              >
                <IconEdit width={16} height={16} />
              </IconButton>
              <IconButton
                label="Удалить коллекцию"
                onClick={() => setDeleteConfirmActive(true)}
              >
                <IconTrash width={16} height={16} />
              </IconButton>
            </div>
          </div>
        </div>

        {activeCollection.items.length === 0 ? (
          <div className={styles.emptyBlock}>
            <p>В этой коллекции пока нет сохраненных сайтов.</p>
            <Button
              variant="ghost"
              onClick={() => setAddSiteModalCollectionId(activeCollection.id)}
            >
              + Добавить первый сайт
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
              description: editCollectionTarget.description,
            }}
            modalTitle="Редактировать коллекцию"
          />
        ) : null}

        {deleteConfirmActive ? (
          <ConfirmDialog
            title={`Удалить коллекцию «${activeCollection.name}»?`}
            body={`Все сохраненные сайты (${activeCollection.items.length}) в этой коллекции будут удалены.`}
            cancelLabel="Отмена"
            confirmLabel="Удалить"
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
      <PageHeader title="Коллекции">
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={() => setAddSiteModalCollectionId(collections[0]?.id || "")}>
            + Добавить сайт
          </Button>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            + Создать коллекцию
          </Button>
        </div>
      </PageHeader>

      <QuickAccess />

      <section aria-labelledby="collections-title">
        <div className={styles.sectionHeader}>
          <h2 id="collections-title" className={styles.sectionTitle}>
            Мои коллекции ({collections.length})
          </h2>
        </div>

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
                        label="Опции коллекции"
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
                            + Добавить сайт
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
                            Редактировать
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
                            Удалить
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {col.description ? (
                    <p className={styles.cardDesc}>{col.description}</p>
                  ) : null}
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.cardCount}>
                    {formatItemsCount(col.items.length)}
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
            description: editCollectionTarget.description,
          }}
          modalTitle="Редактировать коллекцию"
        />
      ) : null}

      {deleteConfirmCollection ? (
        <ConfirmDialog
          title={`Удалить коллекцию «${deleteConfirmCollection.name}»?`}
          body={`Все сохраненные сайты (${deleteConfirmCollection.items.length}) в этой коллекции будут удалены.`}
          cancelLabel="Отмена"
          confirmLabel="Удалить"
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
        {item.description ? (
          <p className={styles.siteNote}>{item.description}</p>
        ) : null}
      </div>

      <div className={styles.siteActions}>
        <IconButton
          label="Переместить в другую коллекцию"
          onClick={onMove}
        >
          <IconMove width={16} height={16} />
        </IconButton>
        <IconButton
          label="Удалить из коллекции"
          onClick={onDelete}
        >
          <IconTrash width={16} height={16} />
        </IconButton>
      </div>
    </article>
  );
}
