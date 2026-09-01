import { useEffect, useState } from "react";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark, IconMore } from "../../components/icons";
import { ProfileHoverCard } from "../../components/ProfileHoverCard";
import { RichText } from "../../components/mentions/RichText";
import { formatDateTime } from "../../lib/datetime";
import { describePost, isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { Post } from "../../types/posts";
import { questionStatus } from "./postTypes";
import styles from "./PostCard.module.css";
import { useI18n } from "../../i18n";

const CATEGORY_LABELS: Record<string, string> = {
  models: "nav.models",
  tools: "feed.tools",
  agents: "feed.agents",
  mcp: "feed.mcp",
};

interface PostCardProps {
  post: Post;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PostCard({ post, onClick, onEdit, onDelete }: PostCardProps) {
  const { language, t } = useI18n();
  const {
    mentionEntities,
    savedItems,
    toggleSavedTarget,
    openProfile,
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
  const saved = isSaved(savedItems, "post", post.id);

  const categoryKey = post.category ? CATEGORY_LABELS[post.category] : undefined;
  const categoryLabel = categoryKey ? t(categoryKey) : post.category;
  const badgeText = categoryLabel ? `${categoryLabel} · ${t(`composer.${post.type}`)}` : t(`composer.${post.type}`);

  const isOwnPost =
    Boolean(userProfile?.username && post.author.handle === userProfile.username) ||
    Boolean(userProfile?.id && post.author.id === userProfile.id);

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
            <span className={styles.solvedBadge}>✓ {t("post.solved")}</span>
          ) : null}
        </div>

        {isOwnPost && (onEdit || onDelete) ? (
          <div className={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
            <IconButton
              label={t("post.options")}
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
                    {t("common.edit")}
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
                    {t("common.delete")}
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
          <ProfileHoverCard
            identifier={post.author.handle || post.author.id}
            initialAuthor={post.author}
            onOpenProfile={() => openProfile(post.author.handle || post.author.id)}
          >
            <button
              type="button"
              className={styles.authorBtn}
              onClick={(e) => {
                e.stopPropagation();
                openProfile(post.author.handle || post.author.id);
              }}
              title={t("post.openAuthor")}
            >
              {post.author.name}
            </button>
          </ProfileHoverCard>
          <span className={styles.dot}>·</span>
          <span className={styles.date}>{formatDateTime(post.createdAt, language === "ru" ? "ru-RU" : "en-US")}</span>
        </div>

        <IconButton
          label={saved ? t("saved.removeBookmark") : t("post.saveBookmark")}
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

