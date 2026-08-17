import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../components/Button/Button";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconClose } from "../../components/icons";
import { Select } from "../../components/ui/Select";
import type { CreatePostInput, Post, PostTopicCategory } from "../../types/posts";
import styles from "./EditPostModal.module.css";

interface EditPostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (postId: string, input: Partial<CreatePostInput>) => void;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "Без категории" },
  { value: "models", label: "Модели" },
  { value: "tools", label: "Инструменты" },
  { value: "agents", label: "Агенты" },
  { value: "mcp", label: "MCP" },
];

export function EditPostModal({
  post,
  isOpen,
  onClose,
  onSave,
}: EditPostModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    if (isOpen && post) {
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.category || "");
    }
  }, [isOpen, post]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave(post.id, {
      title,
      content,
      category: (category as PostTopicCategory) || undefined,
    });
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="edit-post-title" className={styles.title}>
            Редактировать публикацию
          </h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <IconClose width={18} height={18} />
          </IconButton>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-title">
              Заголовок
            </label>
            <input
              id="edit-title"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Тематическая категория</span>
            <Select
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={setCategory}
              placeholder="Выберите категорию..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-content">
              Текст публикации
            </label>
            <textarea
              id="edit-content"
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
            />
          </div>

          <footer className={styles.footer}>
            <Button variant="ghost" type="button" onClick={onClose}>
              Отмена
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!title.trim() || !content.trim()}
            >
              Сохранить
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
