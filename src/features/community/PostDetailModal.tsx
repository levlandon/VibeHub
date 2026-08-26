import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark, IconClose, IconTrash } from "../../components/icons";
import { RichText } from "../../components/mentions/RichText";
import { formatDateTime } from "../../lib/datetime";
import { describePost, isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import { usePosts } from "../posts";
import type { Post, PostComment } from "../../types/posts";
import { postTypeConfig, questionStatus } from "./postTypes";
import styles from "./PostDetailModal.module.css";

const CATEGORY_LABELS: Record<string, string> = {
  models: "Модели",
  tools: "Инструменты",
  agents: "Агенты",
  mcp: "MCP",
};

interface PostDetailModalProps {
  post: Post | null;
  onClose: () => void;
}

export function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  const {
    mentionEntities,
    savedItems,
    toggleSavedTarget,
    openProfile,
    authStatus,
    setAuthModalOpen,
  } = useHub();

  const { acceptAnswer, addComment, deleteComment, getComments, isMutating } = usePosts();
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (post?.id && (!post.comments || post.comments.length === 0)) {
      getComments(post.id);
    }
  }, [post?.id, post?.comments, getComments]);

  useEffect(() => {
    if (!post) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [post, onClose]);

  if (!post) return null;

  const saved = isSaved(savedItems, "post", post.id);
  const status = questionStatus(post);
  const kind = postTypeConfig(post.type);
  const categoryLabel = post.category ? CATEGORY_LABELS[post.category] || post.category : null;
  const badgeText = categoryLabel ? `${categoryLabel} · ${kind.label}` : kind.label;

  const handleAddComment = async (text: string) => {
    if (authStatus !== "authenticated") {
      setAuthModalOpen(true);
      return;
    }
    setCommentError(null);
    try {
      await addComment(post.id, text);
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : "Не удалось отправить комментарий",
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId, post.id);
    } catch (err) {
      console.warn("Failed to delete comment:", err);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headMeta}>
            <span className={styles.badge}>{badgeText}</span>
            {status?.mark === "✓" ? (
              <span className={styles.solvedBadge}>✓ Решено</span>
            ) : null}
          </div>
          <div className={styles.headActions}>
            <IconButton
              label={saved ? "Удалить из закладок" : "Сохранить в закладки"}
              active={saved}
              onClick={() => toggleSavedTarget(describePost(post))}
            >
              <IconBookmark width={16} height={16} />
            </IconButton>
            <IconButton label="Закрыть" onClick={onClose}>
              <IconClose width={18} height={18} />
            </IconButton>
          </div>
        </header>

        <div className={styles.content}>
          <h2 id="post-detail-title" className={styles.title}>
            {post.title}
          </h2>

          <div className={styles.authorRow}>
            <button
              type="button"
              className={styles.authorBtn}
              onClick={() => {
                onClose();
                openProfile(post.author.handle || post.author.id);
              }}
            >
              {post.author.name}
            </button>
            <span className={styles.dot}>·</span>
            <span className={styles.date}>{formatDateTime(post.createdAt)}</span>
          </div>

          <div className={styles.body}>
            <RichText text={post.content} entities={mentionEntities} />
          </div>

          {post.extras &&
            Object.values(post.extras)
              .filter(Boolean)
              .map((href) => (
                <a
                  key={href}
                  className={styles.link}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {href} ↗
                </a>
              ))}

          <hr className={styles.divider} />

          <section className={styles.commentsSection}>
            <h3 className={styles.commentsHeading}>
              Ответы и обсуждение ({post.comments.length})
            </h3>

            {commentError ? (
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "var(--radius-sm)",
                  color: "#f87171",
                  fontSize: "12px",
                  marginBottom: "8px",
                }}
              >
                {commentError}
              </div>
            ) : null}

            {post.comments.length === 0 ? (
              <p className={styles.noComments}>Пока нет ответов. Будьте первым!</p>
            ) : (
              <div className={styles.commentsList}>
                {post.comments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    post={post}
                    comment={comment}
                    onClose={onClose}
                    onAccept={() => acceptAnswer(post.id, comment.id)}
                    onDelete={() => handleDeleteComment(comment.id)}
                  />
                ))}
              </div>
            )}

            <CommentForm
              onSubmit={handleAddComment}
              disabled={isMutating}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  post,
  comment,
  onClose,
  onAccept,
  onDelete,
}: {
  post: Post;
  comment: PostComment;
  onClose: () => void;
  onAccept: () => void;
  onDelete: () => void;
}) {
  const { mentionEntities, openProfile, userProfile } = useHub();
  const accepted = post.acceptedAnswerId === comment.id;

  const isOwnComment =
    Boolean(userProfile?.username && comment.author.handle === userProfile.username) ||
    Boolean(userProfile?.id && comment.author.id === userProfile.id);

  return (
    <div className={`${styles.comment} ${accepted ? styles.accepted : ""}`}>
      <div className={styles.commentHead}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            className={styles.authorBtn}
            onClick={() => {
              onClose();
              openProfile(comment.author.handle || comment.author.id);
            }}
          >
            {comment.author.name}
          </button>
          <span className={styles.dot}>·</span>
          <span className={styles.date}>{formatDateTime(comment.createdAt)}</span>
          {accepted ? <span className={styles.solvedBadge}>✓ Решение</span> : null}
        </div>

        {isOwnComment ? (
          <IconButton label="Удалить комментарий" onClick={onDelete}>
            <IconTrash width={13} height={13} />
          </IconButton>
        ) : null}
      </div>

      <div className={styles.commentBody}>
        <RichText text={comment.content} entities={mentionEntities} />
      </div>

      {post.type === "question" && !accepted ? (
        <div className={styles.commentActions}>
          <Button variant="ghost" onClick={onAccept}>
            Отметить как решение
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CommentForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");

  return (
    <form
      className={styles.replyForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim() || disabled) return;
        onSubmit(text);
        setText("");
      }}
    >
      <input
        className={styles.replyInput}
        value={text}
        placeholder="Написать ответ..."
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        variant="primary"
        type="submit"
        disabled={disabled || !text.trim()}
      >
        {disabled ? "Отправка..." : "Отправить"}
      </Button>
    </form>
  );
}
