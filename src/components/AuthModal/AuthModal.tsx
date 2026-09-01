import { useEffect, useRef, useState } from "react";
import { IconButton } from "../IconButton/IconButton";
import { IconCheck, IconClose, IconGlobe, IconGithub } from "../icons";
import { authService, DEV_SEED_USERS, mapAuthError, type AuthErrorKey } from "../../services/auth";
import { useI18n, type Language } from "../../i18n";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevLogin: (email?: string) => void;
}

export function AuthModal({ isOpen, onClose, onDevLogin }: AuthModalProps) {
  const { language, setLanguage, t } = useI18n();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthErrorKey | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorKey(null);
    setEmail("");
    setPassword("");
    setName("");
    setLanguageOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (languageOpen) {
        setLanguageOpen(false);
        languageButtonRef.current?.focus();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, languageOpen, onClose]);

  useEffect(() => {
    if (!languageOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [languageOpen]);

  if (!isOpen) return null;

  const handleGithubClick = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setErrorKey(null);
      await authService.signInWithOAuth("github");
    } catch (err) {
      console.error("[AuthModal] GitHub OAuth error:", err);
      setErrorKey("oauthFailure");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email.trim() || !password.trim()) return;

    if (isSignUp && password.length < 6) {
      setErrorKey("passwordTooShort");
      return;
    }

    try {
      setLoading(true);
      setErrorKey(null);
      if (isSignUp) {
        await authService.signUp({ email, password, name });
      } else {
        await authService.signInWithPassword({ email, password });
      }
      onClose();
    } catch (err) {
      setErrorKey(mapAuthError(err));
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
            {t(isSignUp ? "auth.register.title" : "auth.login.title")}
          </h2>
          <div className={styles.headerActions} ref={languageRef}>
            <IconButton
              ref={languageButtonRef}
              label={t("language.select")}
              aria-haspopup="menu"
              aria-expanded={languageOpen}
              onClick={() => setLanguageOpen((open) => !open)}
            >
              <IconGlobe width={16} height={16} />
            </IconButton>
            {languageOpen ? (
              <div className={styles.languageMenu} role="menu" aria-label={t("language.choose")}>
                {(["ru", "en"] as Language[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === option}
                    className={styles.languageOption}
                    onClick={() => {
                      setLanguage(option);
                      setLanguageOpen(false);
                      languageButtonRef.current?.focus();
                    }}
                  >
                    <span>{option === "ru" ? "Русский" : "English"}</span>
                    {language === option ? <IconCheck width={14} height={14} /> : null}
                  </button>
                ))}
              </div>
            ) : null}
            <IconButton label={t("common.close")} onClick={onClose}>
              <IconClose width={16} height={16} />
            </IconButton>
          </div>
        </header>

        <div className={styles.content}>
          <p className={styles.desc}>
            {t("auth.description")}
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
                {loading ? t("auth.oauth.loading") : t("auth.oauth.github")}
              </span>
            </button>

            {errorKey ? (
              <div className={styles.errorBox}>
                <span>{t(`auth.errors.${errorKey}`)}</span>
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
                  {t("auth.retry")}
                </button>
              </div>
            ) : null}

            {isDev ? (
              <>
                <form className={styles.form} onSubmit={handleFormSubmit}>
                  {isSignUp ? (
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel} htmlFor="auth-name">{t("auth.name")}</label>
                      <input
                        id="auth-name"
                        type="text"
                        className={styles.input}
                        placeholder={t("auth.name.placeholder")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  ) : null}

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="auth-email">{t("auth.email")}</label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      className={styles.input}
                      placeholder={t("auth.email.placeholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="auth-password">{t("auth.password")}</label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      className={styles.input}
                      placeholder={t("auth.password.placeholder")}
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
                      ? t("auth.submit.loading")
                      : isSignUp
                        ? t("auth.submit.register")
                        : t("auth.submit.login")}
                  </button>

                  <button
                    type="button"
                    className={styles.toggleModeBtn}
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setErrorKey(null);
                    }}
                  >
                    {isSignUp
                      ? t("auth.toggle.toLogin")
                      : t("auth.toggle.toRegister")}
                  </button>
                </form>

                <div className={styles.devSection}>
                  <div className={styles.devTitle}>
                    <span className={styles.devBadge}>{t("auth.dev.only")}</span>
                    <span>{t("auth.dev.quickLogin")}</span>
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
