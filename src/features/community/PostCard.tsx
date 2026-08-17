import { useEffect, useState } from "react";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark, IconMore } from "../../components/icons";
import { RichText } from "../../components/mentions/RichText";
import { formatDateTime } from "../../lib/datetime";
import { describePost, isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { Post } from "../../types/posts";
import { postTypeConfig, questionStatus } from "./postTypes";
import styles from "./PostCard.module.css";

const CATEGORY_LABELS: Record<string, string> = {
  models: "Модели",
  tools: "Инструменты",
  agents: "Агенты",
  mcp: "MCP",
};

interface PostCardProps {
  post: Post;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PostCard({ post, onClick, onEdit, onDelete }: PostCardProps) {
  const {
    mentionEntities,
    savedItems,
    toggleSavedTarget,
    setRoute,
    userProfile,
  } = useHub();

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleDocClick = () => setMenuOpen(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const status = questionStatus(post);
  const kind = postTypeConfig(post.type);
  const saved = isSaved(savedItems, "post", post.id);

  const categoryLabel = post.category ? CATEGORY_LABELS[post.category] || post.category : null;
  const badgeText = categoryLabel ? `${categoryLabel} · ${kind.label}` : kind.label;

  const isOwnPost =
    post.author.handle === userProfile.username ||
    post.author.name === userProfile.displayName ||
    post.author.handle === "user";

  return (
    <article
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Top Header: Badge + Actions */}
      <header className={styles.head}>
        <div className={styles.badgesWrap}>
          <span className={styles.badge}>{badgeText}</span>
          {status?.mark === "✓" ? (
            <span className={styles.solvedBadge}>✓ Решено</span>
          ) : null}
        </div>

        {isOwnPost && (onEdit || onDelete) ? (
          <div className={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
            <IconButton
              label="Опции публикации"
              className={styles.menuTrigger}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
            >
              <IconMore width={16} height={16} />
            </IconButton>

            {menuOpen ? (
              <div
                className={styles.menuDropdown}
                role="menu"
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit ? (
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                  >
                    Редактировать
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* Title */}
      <h3 className={styles.title}>{post.title}</h3>

      {/* Preview text */}
      <div className={styles.preview}>
        <RichText text={post.content} entities={mentionEntities} />
      </div>

      {/* Footer: Author · Date & Bookmark */}
      <footer className={styles.footer}>
        <div className={styles.metaLeft}>
          <button
            type="button"
            className={styles.authorBtn}
            onClick={(e) => {
              e.stopPropagation();
              setRoute("profile");
            }}
            title="Открыть профиль автора"
          >
            {post.author.name}
          </button>
          <span className={styles.dot}>·</span>
          <span className={styles.date}>{formatDateTime(post.createdAt)}</span>
        </div>

        <IconButton
          label={saved ? "Удалить из закладок" : "Сохранить в закладки"}
          active={saved}
          className={styles.bookmarkBtn}
          onClick={(e) => {
            e.stopPropagation();
            toggleSavedTarget(describePost(post));
          }}
        >
          <IconBookmark width={16} height={16} />
        </IconButton>
      </footer>
    </article>
  );
}


