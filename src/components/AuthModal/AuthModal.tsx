import { useEffect, useState } from "react";
import { IconButton } from "../IconButton/IconButton";
import { IconClose, IconGithub } from "../icons";
import { authService, DEV_SEED_USERS } from "../../services/auth/authService";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevLogin: (email?: string) => void;
}

export function AuthModal({ isOpen, onClose, onDevLogin }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setEmail("");
    setPassword("");
    setName("");
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGithubClick = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);
      await authService.signInWithOAuth("github");
    } catch (err) {
      console.error("[AuthModal] GitHub OAuth error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось запустить авторизацию через GitHub. Проверьте конфигурацию провайдера.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setError(null);
      if (isSignUp) {
        await authService.signUp({ email, password, name });
      } else {
        await authService.signInWithPassword({ email, password });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
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
            {isDev && isSignUp ? "Регистрация в VibeHub" : "Войти в VibeHub"}
          </h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <IconClose width={16} height={16} />
          </IconButton>
        </header>

        <div className={styles.content}>
          <p className={styles.desc}>
            Войдите через GitHub, чтобы сохранять модели, создавать коллекции и участвовать в сообществе.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.githubBtn}
              onClick={handleGithubClick}
              disabled={loading}
            >
              <IconGithub width={18} height={18} />
              <span>
                {loading ? "Подключение к GitHub…" : "Продолжить с GitHub"}
              </span>
            </button>

            {error ? (
              <div className={styles.errorBox}>
                <span>{error}</span>
                <button
                  type="button"
                  style={{
                    marginLeft: "8px",
                    textDecoration: "underline",
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 600,
                  }}
                  onClick={handleGithubClick}
                >
                  Повторить
                </button>
              </div>
            ) : null}

            {isDev ? (
              <>
                <form className={styles.form} onSubmit={handleFormSubmit}>
                  {isSignUp ? (
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Имя</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Алексей"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  ) : null}

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Email</label>
                    <input
                      type="email"
                      required
                      className={styles.input}
                      placeholder="alex@vibehub.dev"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Пароль</label>
                    <input
                      type="password"
                      required
                      className={styles.input}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || !email.trim() || !password.trim()}
                  >
                    {loading
                      ? "Подождите..."
                      : isSignUp
                        ? "Зарегистрироваться"
                        : "Войти с паролем"}
                  </button>

                  <button
                    type="button"
                    className={styles.toggleModeBtn}
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                    }}
                  >
                    {isSignUp
                      ? "Уже есть аккаунт? Войти"
                      : "Нет аккаунта? Зарегистрироваться"}
                  </button>
                </form>

                <div className={styles.devSection}>
                  <div className={styles.devTitle}>
                    <span className={styles.devBadge}>Dev Only</span>
                    <span>Быстрый вход для тестов:</span>
                  </div>
                  <div className={styles.devUsersList}>
                    {DEV_SEED_USERS.map((u) => (
                      <button
                        key={u.email}
                        type="button"
                        className={styles.devUserBtn}
                        onClick={() => {
                          onDevLogin(u.email);
                          onClose();
                        }}
                      >
                        <span className={styles.devUserName}>{u.name}</span>
                        <span className={styles.devUserRole}>
                          @{u.handle} · {u.roleLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
