import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../../i18n";
import { Button } from "../Button/Button";
import styles from "./CreateCollectionModal.module.css";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { name: string; description?: string }) => void;
  initialValues?: { name?: string; description?: string };
  modalTitle?: string;
}

export function CreateCollectionModal({
  isOpen,
  onClose,
  onSave,
  initialValues,
  modalTitle,
}: CreateCollectionModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  useEffect(() => {
    if (isOpen) {
      setName(initialValues?.name ?? "");
      setDescription(initialValues?.description ?? "");
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const resolvedModalTitle = modalTitle ?? t("collections.newTitle");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="create-col-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="create-col-title" className={styles.title}>
          {resolvedModalTitle}
        </h2>
        <form onSubmit={handleSubmit}>
          <label className={styles.field}>
            {t("collections.nameRequired")}
            <input
              autoFocus
              type="text"
              placeholder={t("collections.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            {t("collections.descriptionOptional")}
            <textarea
              placeholder={t("collections.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          <div className={styles.actions}>
            <Button variant="text" onClick={onClose} type="button">
              {t("common.cancel")}
            </Button>
            <Button variant="primary" disabled={!name.trim()} type="submit">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
