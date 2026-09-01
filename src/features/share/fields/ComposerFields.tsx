import { MentionField } from "../../../components/mentions/MentionField";
import type { ExtraField } from "../../../config/postTypes";
import type { PostDraft } from "../types";
import { useI18n } from "../../../i18n";
import styles from "./ComposerFields.module.css";

export function TitleField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <input
      className={styles.title}
      value={value}
      placeholder={t("composer.title")}
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
  const { t } = useI18n();
  return (
    <MentionField
      className={styles.body}
      value={value}
      onChange={onChange}
      placeholder={t("composer.content")}
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
  const { t } = useI18n();
  const labelKey = field.key === "repositoryUrl" ? "composer.repository" : field.key === "demoUrl" ? "composer.demo" : "composer.link";
  return (
    <label className={styles.extra}>
      {t(labelKey)}
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
