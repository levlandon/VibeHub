import { useEffect, useState } from "react";
import { IconButton } from "../IconButton/IconButton";
import { IconClose, IconSliders } from "../icons";
import { useI18n } from "../../i18n";
import styles from "./SettingsModal.module.css";

export type SettingsTab = "general" | "theme" | "language" | "profile";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { language, setLanguage, t } = useI18n();
  const [theme, setTheme] = useState<"dark" | "system">("dark");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerTitleRow}>
            <IconSliders width={18} height={18} />
            <h2 id="settings-modal-title" className={styles.title}>
              {t("settings.title")}
            </h2>
          </div>
          <IconButton label={t("common.close")} onClick={onClose}>
            <IconClose width={16} height={16} />
          </IconButton>
        </header>

        <div className={styles.content}>
          <div className={styles.settingItem}>
            <div className={styles.settingMeta}>
              <span className={styles.settingLabel}>{t("settings.theme")}</span>
              <span className={styles.settingDesc}>{t("settings.theme.description")}</span>
            </div>
            <select
              className={styles.select}
              value={theme}
              onChange={(e) => setTheme(e.target.value as "dark" | "system")}
            >
              <option value="dark">{t("settings.theme.dark")}</option>
              <option value="system">{t("settings.theme.system")}</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingMeta}>
              <span className={styles.settingLabel}>{t("settings.language")}</span>
              <span className={styles.settingDesc}>{t("settings.language.description")}</span>
            </div>
            <select
              className={styles.select}
              value={language}
              aria-label={t("settings.language")}
              onChange={(e) => setLanguage(e.target.value as "ru" | "en")}
            >
              <option value="ru">Русский (RU)</option>
              <option value="en">English (EN)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
