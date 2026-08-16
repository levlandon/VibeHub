import { Button } from "../../components/Button/Button";
import type { CreatePostInput, PostType } from "../../types/posts";
import type { PostDraft } from "./types";
import { TYPE_FORMS } from "./forms/registry";
import styles from "./PostComposer.module.css";

export function PostComposer({
  type,
  draft,
  onChange,
  onSubmit,
}: {
  type: PostType;
  draft: PostDraft;
  onChange: (draft: PostDraft) => void;
  onSubmit: (input: CreatePostInput) => void;
}) {
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
          title: draft.title,
          content: draft.content,
          tags: [],
          extras: draft.extras,
        });
      }}
    >
      <Form draft={draft} onChange={onChange} />
      <div className={styles.bar}>
        <Button variant="primary" type="submit" disabled={!ready}>
          Опубликовать
        </Button>
      </div>
    </form>
  );
}
