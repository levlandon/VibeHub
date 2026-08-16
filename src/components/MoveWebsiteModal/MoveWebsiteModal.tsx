import { useState, type FormEvent } from "react";
import { Button } from "../Button/Button";
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
  const targetOptions = collections.filter((c) => c.id !== currentCollectionId);
  const [selectedId, setSelectedId] = useState(targetOptions[0]?.id || "");

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    onMove(selectedId);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="move-site-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="move-site-title" className={styles.title}>
          Переместить «{itemTitle}»
        </h2>
        {targetOptions.length === 0 ? (
          <div>
            <p>Нет других коллекций для перемещения.</p>
            <div className={styles.actions}>
              <Button variant="text" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className={styles.field}>
              Выберите новую коллекцию
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                {targetOptions.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <Button variant="text" onClick={onClose} type="button">
                Отмена
              </Button>
              <Button variant="primary" disabled={!selectedId} type="submit">
                Переместить
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
