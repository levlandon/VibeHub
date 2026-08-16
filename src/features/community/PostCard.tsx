import { useState } from "react";
import { Button } from "../../components/Button/Button";
import { RichText } from "../../components/mentions/RichText";
import { formatDateTime } from "../../lib/datetime";
import { useHub } from "../../state/HubContext";
import type { Post, PostComment } from "../../types/posts";
import { describePost, isSaved } from "../../services/saved";
import { postTypeConfig, questionStatus } from "./postTypes";
import styles from "./PostCard.module.css";

export function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  const { mentionEntities, acceptAnswer, addComment, savedItems, toggleSavedTarget } = useHub();
  const status = questionStatus(post);
  const kind = postTypeConfig(post.type);
  const saved = isSaved(savedItems, "post", post.id);

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <strong>{post.title}</strong>
        {status ? (
          <span className={styles.status}>
            {status.mark} {status.label}
          </span>
        ) : (
          <span className={styles.kind}>{kind.label}</span>
        )}
        {!compact ? (
          <button
            type="button"
            className={styles.kind}
            onClick={() => toggleSavedTarget(describePost(post))}
          >
            {saved ? "Сохранено" : "Сохранить"}
          </button>
        ) : null}
      </header>
      <p className={styles.body}>
        <RichText text={post.content} entities={mentionEntities} />
      </p>
      {Object.values(post.extras)
        .filter(Boolean)
        .map((href) => (
          <a key={href} className={styles.link} href={href} target="_blank" rel="noreferrer">
            {href}
          </a>
        ))}
      <p className={styles.meta}>
        {post.author.name} · {formatDateTime(post.createdAt)}
      </p>
      {!compact
        ? post.comments.map((comment) => (
            <CommentRow
              key={comment.id}
              post={post}
              comment={comment}
              onAccept={() => acceptAnswer(post.id, comment.id)}
            />
          ))
        : null}
      {!compact && post.type === "question" ? (
        <CommentForm onSubmit={(text) => addComment(post.id, text)} />
      ) : null}
    </article>
  );
}

function CommentRow({
  post,
  comment,
  onAccept,
}: {
  post: Post;
  comment: PostComment;
  onAccept: () => void;
}) {
  const { mentionEntities } = useHub();
  const accepted = post.acceptedAnswerId === comment.id;

  return (
    <div className={`${styles.comment} ${accepted ? styles.accepted : ""}`}>
      <p>
        <RichText text={comment.content} entities={mentionEntities} />
      </p>
      <p className={styles.meta}>
        {comment.author.name}
        {post.type === "question" && !accepted ? (
          <Button variant="text" onClick={onAccept}>
            Отметить как решение
          </Button>
        ) : null}
        {accepted ? <span className={styles.status}>✓ Решение</span> : null}
      </p>
    </div>
  );
}

function CommentForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className={styles.reply}
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSubmit(text);
        setText("");
      }}
    >
      <input value={text} placeholder="Ответ" onChange={(e) => setText(e.target.value)} />
    </form>
  );
}

