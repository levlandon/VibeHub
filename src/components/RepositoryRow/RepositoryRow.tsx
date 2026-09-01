import { memo, type KeyboardEvent } from "react";
import { IconButton } from "../IconButton/IconButton";
import { IconBookmark, IconGithub } from "../icons";
import type { SavedItem } from "../../types/saved";
import styles from "./RepositoryRow.module.css";
import { useI18n } from "../../i18n";

export interface RepositoryRowProps {
  item: SavedItem;
  bookmarked: boolean;
  onBookmark: () => void;
}

export const RepositoryRow = memo(function RepositoryRow({
  item,
  bookmarked,
  onBookmark,
}: RepositoryRowProps) {
  const { t } = useI18n();
  const url =
    item.url ||
    (item.owner && item.name
      ? `https://github.com/${item.owner}/${item.name}`
      : `https://github.com/${item.targetId}`);
  const owner =
    item.owner ||
    item.subtitle ||
    (item.targetId.includes("/") ? item.targetId.split("/")[0] : "");
  const name =
    item.name ||
    item.title ||
    (item.targetId.includes("/") ? item.targetId.split("/")[1] : item.targetId);

  const handleOpen = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  return (
    <article
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={t("repository.open", { name: owner ? `${owner}/${name}` : name })}
    >
      <div className={styles.mark} aria-hidden>
        {item.avatar ? (
          <img
            src={item.avatar}
            alt={owner || name}
            className={styles.avatarImg}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <IconGithub width={20} height={20} />
        )}
      </div>

      <div className={styles.body}>
        <h2 className={styles.name}>
          {owner ? <span className={styles.owner}>{owner} / </span> : null}
          <span className={styles.repoName}>{name}</span>
          <span className={styles.extIcon} aria-hidden>
            ↗
          </span>
        </h2>
        {item.description ? (
          <p className={styles.description}>{item.description}</p>
        ) : null}
      </div>

      <div
        className={styles.actions}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <IconButton
          label={bookmarked ? t("saved.removeBookmark") : t("common.save")}
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
