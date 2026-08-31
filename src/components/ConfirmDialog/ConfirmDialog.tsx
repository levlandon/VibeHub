import { Button } from "../Button/Button";
import styles from "./ConfirmDialog.module.css";

export function ConfirmDialog({
  title,
  body,
  cancelLabel,
  confirmLabel,
  confirmVariant = "default",
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "default";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.box}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-body">{body}</p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            className={confirmVariant === "danger" ? styles.dangerBtn : ""}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
