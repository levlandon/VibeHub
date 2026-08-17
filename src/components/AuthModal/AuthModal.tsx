import { useEffect, useState } from "react";
import { IconButton } from "../IconButton/IconButton";
import { IconClose, IconGithub } from "../icons";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevLogin: () => void;
}

export function AuthModal({ isOpen, onClose, onDevLogin }: AuthModalProps) {
  const [oauthNote, setOauthNote] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOauthNote(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGithubClick = () => {
    setOauthNote(true);
  };

  const isDev = Boolean(import.meta.env.DEV);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="auth-modal-title" className={styles.title}>
            Войти в VibeHub
          </h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <IconClose width={16} height={16} />
          </IconButton>
        </header>

        <div className={styles.content}>
          <p className={styles.desc}>
            Войдите, чтобы сохранять модели, участвовать в обсуждениях и настраивать профиль.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.githubBtn}
              onClick={handleGithubClick}
            >
              <IconGithub width={18} height={18} />
              <span>Продолжить с GitHub</span>
            </button>

            {oauthNote ? (
              <div className={styles.note}>
                Подключение GitHub OAuth находится в разработке и появится в ближайшем обновлении.
              </div>
            ) : null}

            {isDev ? (
              <div className={styles.devRow}>
                <button
                  type="button"
                  className={styles.devBtn}
                  onClick={() => {
                    onDevLogin();
                    onClose();
                  }}
                >
                  <span className={styles.devBadge}>Dev</span>
                  <span>Войти как тестовый пользователь</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

