import { useState } from "react";
import { Button } from "../../components/Button/Button";
import { Select } from "../../components/ui/Select";
import type { CreatePostInput, PostTopicCategory, PostType } from "../../types/posts";
import type { PostDraft } from "./types";
import { TYPE_FORMS } from "./forms/registry";
import styles from "./PostComposer.module.css";

const CATEGORY_OPTIONS = [
  { value: "", label: "Без категории" },
  { value: "models", label: "Модели" },
  { value: "tools", label: "Инструменты" },
  { value: "agents", label: "Агенты" },
  { value: "mcp", label: "MCP" },
];

export function PostComposer({
  type,
  draft,
  onChange,
  onSubmit,
  disabled = false,
}: {
  type: PostType;
  draft: PostDraft;
  onChange: (draft: PostDraft) => void;
  onSubmit: (input: CreatePostInput) => void;
  disabled?: boolean;
}) {
  const [category, setCategory] = useState<string>("");
  const Form = TYPE_FORMS[type];
  const ready = Boolean(draft.title.trim() && draft.content.trim());

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onSubmit({
          type,
          category: (category as PostTopicCategory) || undefined,
          title: draft.title,
          content: draft.content,
          tags: [],
          extras: draft.extras,
        });
      }}
    >
      <div className={styles.categoryField}>
        <span className={styles.categoryLabel}>Тематическая категория:</span>
        <Select
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={setCategory}
          placeholder="Выберите категорию (опционально)..."
        />
      </div>

      <Form draft={draft} onChange={onChange} />
      <div className={styles.bar}>
        <Button variant="primary" type="submit" disabled={disabled || !ready}>
          {disabled ? "Публикация..." : "Опубликовать"}
        </Button>
      </div>
    </form>
  );
}

