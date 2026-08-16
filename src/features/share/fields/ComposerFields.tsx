import { MentionField } from "../../../components/mentions/MentionField";
import type { ExtraField } from "../../../config/postTypes";
import type { PostDraft } from "../types";
import styles from "./ComposerFields.module.css";

export function TitleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className={styles.title}
      value={value}
      placeholder="Заголовок"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ContentField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <MentionField
      className={styles.body}
      value={value}
      onChange={onChange}
      placeholder="Текст. Можно упомянуть @модель или @инструмент"
      rows={4}
    />
  );
}

export function ExtraTextField({
  field,
  value,
  onChange,
}: {
  field: ExtraField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.extra}>
      {field.label}
      <input
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function patchDraft(
  draft: PostDraft,
  patch: Partial<Pick<PostDraft, "title" | "content">> & {
    extras?: Record<string, string>;
  },
): PostDraft {
  return {
    ...draft,
    ...patch,
    extras: { ...draft.extras, ...patch.extras },
  };
}
