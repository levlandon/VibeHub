import { useState, type FormEvent } from "react";
import { useI18n } from "../../i18n";
import { Button } from "../Button/Button";
import { Select } from "../ui/Select";
import styles from "./MoveWebsiteModal.module.css";

interface MoveWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  currentCollectionId: string;
  collections: { id: string; name: string }[];
  onMove: (toCollectionId: string) => void;
}

export function MoveWebsiteModal({
  isOpen,
  onClose,
  itemTitle,
  currentCollectionId,
  collections,
  onMove,
}: MoveWebsiteModalProps) {
  const { t } = useI18n();
  const targetOptions = collections.filter((c) => c.id !== currentCollectionId);
  const [selectedId, setSelectedId] = useState(targetOptions[0]?.id || "");

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    onMove(selectedId);
  };

  const selectOptions = targetOptions.map((col) => ({
    value: col.id,
    label: col.name,
  }));

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="move-site-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="move-site-title" className={styles.title}>
          {t("collections.moveTitle", { title: itemTitle })}
        </h2>
        {targetOptions.length === 0 ? (
          <div>
            <p>{t("collections.noOther")}</p>
            <div className={styles.actions}>
              <Button variant="text" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t("collections.chooseTarget")}</span>
              <Select
                value={selectedId}
                options={selectOptions}
                onChange={setSelectedId}
                placeholder={t("collections.choosePlaceholder")}
              />
            </div>
            <div className={styles.actions}>
              <Button variant="text" onClick={onClose} type="button">
                {t("common.cancel")}
              </Button>
              <Button variant="primary" disabled={!selectedId} type="submit">
                {t("collections.move")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
