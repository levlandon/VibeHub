import { useState } from "react";
import { AddWebsiteModal } from "../../components/AddWebsiteModal/AddWebsiteModal";
import { Button } from "../../components/Button/Button";
import { CreateCollectionModal } from "../../components/CreateCollectionModal/CreateCollectionModal";
import { MoveWebsiteModal } from "../../components/MoveWebsiteModal/MoveWebsiteModal";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { QuickAccess } from "../../components/QuickAccess/QuickAccess";
import { SiteIcon } from "../../components/SiteIcon/SiteIcon";
import { useCollections } from "../../hooks/useCollections";
import type { CollectionItem, CreateCollectionItemInput } from "../../types/collections";
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
    activeCollectionId,
    setActiveCollectionId,
    createCollection,
    updateCollection,
    deleteCollection,
    addItem,
    removeItem,
    moveItem,
  } = useCollections();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editColModalOpen, setEditColModalOpen] = useState(false);
  const [addSiteModalOpen, setAddSiteModalOpen] = useState(false);
  const [moveModalItem, setMoveModalItem] = useState<{
    item: CollectionItem;
    fromCollectionId: string;
  } | null>(null);

  const handleAddSite = async (
    collectionId: string,
    input: CreateCollectionItemInput,
  ) => {
    await addItem(collectionId, input);
    setAddSiteModalOpen(false);
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
    if (!activeCollectionId) return;
    await updateCollection(activeCollectionId, input);
    setEditColModalOpen(false);
  };

  const handleDeleteActiveCollection = async () => {
    if (!activeCollection) return;
    const confirmDelete = window.confirm(
      `Вы уверены, что хотите удалить коллекцию «${activeCollection.name}» и все сохраненные в ней сайты (${activeCollection.items.length})?`,
    );
    if (confirmDelete) {
      await deleteCollection(activeCollection.id);
    }
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
                onClick={() => setAddSiteModalOpen(true)}
              >
                + Добавить сайт
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditColModalOpen(true)}
              >
                Редактировать
              </Button>
              <Button
                variant="text"
                onClick={handleDeleteActiveCollection}
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>

        {activeCollection.items.length === 0 ? (
          <div className={styles.emptyBlock}>
            <p>В этой коллекции пока нет сохраненных сайтов.</p>
            <Button
              variant="ghost"
              onClick={() => setAddSiteModalOpen(true)}
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
          isOpen={addSiteModalOpen}
          onClose={() => setAddSiteModalOpen(false)}
          onSave={handleAddSite}
          collections={collections}
          defaultCollectionId={activeCollection.id}
        />

        <CreateCollectionModal
          isOpen={editColModalOpen}
          onClose={() => setEditColModalOpen(false)}
          onSave={handleEditCollection}
          initialValues={{
            name: activeCollection.name,
            description: activeCollection.description,
          }}
          modalTitle="Редактировать коллекцию"
        />

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
          <Button variant="ghost" onClick={() => setAddSiteModalOpen(true)}>
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
        isOpen={addSiteModalOpen}
        onClose={() => setAddSiteModalOpen(false)}
        onSave={handleAddSite}
        collections={collections}
      />

      <CreateCollectionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateCollection}
      />

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
        <button
          type="button"
          className={styles.actionBtn}
          title="Переместить в другую коллекцию"
          onClick={onMove}
        >
          ⇄ Переместить
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          title="Удалить из коллекции"
          onClick={onDelete}
        >
          ✕
        </button>
      </div>
    </article>
  );
}
