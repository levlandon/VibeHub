import { type KeyboardEvent } from "react";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark } from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { useHub } from "../../state/HubContext";
import styles from "./Library.module.css";

export function BookmarksPage() {
  const { savedItems, toggleSavedTarget, openEntity } = useHub();

  return (
    <div className={styles.page}>
      <PageHeader title="Закладки" />
      {savedItems.length === 0 ? (
        <EmptyState>
          <div className={styles.emptyContent}>
            <h3>Нет сохранённых закладок</h3>
            <p>
              Вы можете сохранять интересные модели и инструменты в каталоге, нажимая на иконку закладки.
            </p>
          </div>
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {savedItems.map((item) => {
            const handleOpen = () => {
              if (item.kind === "model" || item.kind === "tool") {
                openEntity(item.kind, item.targetId);
              }
            };

            const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpen();
              }
            };

            return (
              <li key={item.id}>
                <article
                  className={styles.savedRow}
                  role="button"
                  tabIndex={0}
                  onClick={handleOpen}
                  onKeyDown={handleKeyDown}
                  aria-label={`Открыть ${item.title}`}
                >
                  <div className={styles.savedBody}>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>
                  <div
                    className={styles.savedActions}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      label="Убрать из закладок"
                      active
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSavedTarget({
                          kind: item.kind,
                          targetId: item.targetId,
                          title: item.title,
                          subtitle: item.subtitle,
                          url: item.url,
                        });
                      }}
                    >
                      <IconBookmark width={18} height={18} />
                    </IconButton>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { CollectionsPage } from "./CollectionsPage";
