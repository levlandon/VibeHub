import { useState } from "react";
import { useI18n } from "../../i18n";
import { useHub } from "../../state/HubContext";
import { Button } from "../Button/Button";
import styles from "./AddModal.module.css";

const OPTIONS = [
  { id: "tool", labelKey: "add.tool" },
  { id: "skill", labelKey: "add.skill" },
  { id: "mcp", labelKey: "add.mcp" },
  { id: "plugin", labelKey: "add.plugin" },
  { id: "link", labelKey: "add.link" },
] as const;

export function AddModal() {
  const { t } = useI18n();
  const { addOpen, setAddOpen } = useHub();
  const [picked, setPicked] = useState<(typeof OPTIONS)[number]["id"] | null>(null);

  if (!addOpen) return null;

  const close = () => {
    setAddOpen(false);
    setPicked(null);
  };

  return (
    <div className={styles.overlay} onClick={close} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="add-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-title">{t("add.title")}</h2>
        {picked ? (
          <p className={styles.note}>
            {t("add.mock", {
              type: t(OPTIONS.find((option) => option.id === picked)?.labelKey ?? "add.tool"),
            })}
          </p>
        ) : (
          <div className={styles.choices}>
            {OPTIONS.map((option) => (
              <Button key={option.id} onClick={() => setPicked(option.id)}>
                {t(option.labelKey)}
              </Button>
            ))}
          </div>
        )}
        <Button variant="text" onClick={close}>
          {t("common.close")}
        </Button>
      </div>
    </div>
  );
}
