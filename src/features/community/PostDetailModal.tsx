import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark, IconClose } from "../../components/icons";
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
    setRoute,
  } = useHub();

  const { acceptAnswer, addComment, getComments } = usePosts();

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
                setRoute("profile");
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
                  />
                ))}
              </div>
            )}

            <CommentForm onSubmit={(text) => addComment(post.id, text)} />
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
}: {
  post: Post;
  comment: PostComment;
  onClose: () => void;
  onAccept: () => void;
}) {
  const { mentionEntities, setRoute } = useHub();
  const accepted = post.acceptedAnswerId === comment.id;

  return (
    <div className={`${styles.comment} ${accepted ? styles.accepted : ""}`}>
      <div className={styles.commentHead}>
        <button
          type="button"
          className={styles.authorBtn}
          onClick={() => {
            onClose();
            setRoute("profile");
          }}
        >
          {comment.author.name}
        </button>
        <span className={styles.dot}>·</span>
        <span className={styles.date}>{formatDateTime(comment.createdAt)}</span>
        {accepted ? <span className={styles.solvedBadge}>✓ Решение</span> : null}
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

function CommentForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");

  return (
    <form
      className={styles.replyForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSubmit(text);
        setText("");
      }}
    >
      <input
        className={styles.replyInput}
        value={text}
        placeholder="Написать ответ..."
        onChange={(e) => setText(e.target.value)}
      />
      <Button variant="primary" type="submit" disabled={!text.trim()}>
        Отправить
      </Button>
    </form>
  );
}
