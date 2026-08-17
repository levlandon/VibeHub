import { useEffect, useMemo, useState } from "react";
import type { Model, Tool } from "../../types/hub";
import type { UserProfile } from "../../types/profile";
import { profileService } from "../../services/profile";
import { DEFAULT_INTEREST_TAGS } from "../../services/profile/profileRepository";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";
import {
  IconCheck,
  IconClose,
  IconModels,
  IconSearch,
  IconSparkles,
} from "../icons";
import styles from "./SettingsModal.module.css";

export type SettingsTab = "profile" | "preferences" | "interface" | "privacy";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => boolean;
  initialTab?: SettingsTab;
  availableModels?: Model[];
  availableTools?: Tool[];
}

function resolveModelInfo(id: string, availableModels: Model[]) {
  const found = availableModels.find((m) => m.id === id);
  if (found) {
    return { name: found.name, provider: found.provider };
  }
  const parts = id.split("/");
  return {
    name: parts.length > 1 ? parts.slice(1).join("/") : id,
    provider: parts.length > 1 ? parts[0] : undefined,
  };
}

export function SettingsModal({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  availableModels = [],
}: SettingsModalProps) {
  const [formProfile, setFormProfile] = useState<UserProfile>(profile);
  const [errors, setErrors] = useState<Partial<Record<keyof UserProfile, string>>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [modelSearch, setModelSearch] = useState("");

  // Sync with profile when opened
  useEffect(() => {
    if (isOpen) {
      setFormProfile({
        ...profile,
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        models: Array.isArray(profile.models) ? profile.models : [],
      });
      setErrors({});
      setSavedSuccess(false);
      setModelSearch("");
    }
  }, [isOpen, profile]);

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

  const searchResults = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return [];
    const selected = formProfile.models || [];
    return availableModels
      .filter((m) => !selected.includes(m.id))
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [modelSearch, availableModels, formProfile.models]);

  if (!isOpen) return null;

  const handleSave = () => {
    const validation = profileService.validateProfile(formProfile);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const success = onSaveProfile(formProfile);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    }
  };

  const toggleInterest = (tag: string) => {
    const current = formProfile.interests || [];
    if (current.includes(tag)) {
      setFormProfile((prev) => ({
        ...prev,
        interests: prev.interests.filter((t) => t !== tag),
      }));
    } else {
      setFormProfile((prev) => ({
        ...prev,
        interests: [...prev.interests, tag],
      }));
    }
  };

  const addModel = (modelId: string) => {
    const current = formProfile.models || [];
    if (!current.includes(modelId)) {
      setFormProfile((prev) => ({
        ...prev,
        models: [...(prev.models || []), modelId],
      }));
    }
    setModelSearch("");
  };

  const removeModel = (modelId: string) => {
    setFormProfile((prev) => ({
      ...prev,
      models: (prev.models || []).filter((id) => id !== modelId),
    }));
  };

  const initials = profileService.getInitials(formProfile.displayName, formProfile.username);

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
          <h2 id="settings-modal-title" className={styles.title}>
            Редактировать профиль
          </h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <IconClose width={18} height={18} />
          </IconButton>
        </header>

        <div className={styles.content}>
          <div className={styles.formGrid}>
            {/* Avatar & Basics */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-avatar">
                Аватар (URL)
              </label>
              <div className={styles.avatarRow}>
                <div className={styles.avatarPreview}>
                  {formProfile.avatar ? (
                    <img
                      src={formProfile.avatar}
                      alt={formProfile.displayName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <input
                  id="profile-avatar"
                  type="url"
                  className={styles.input}
                  placeholder="https://example.com/avatar.jpg"
                  value={formProfile.avatar}
                  onChange={(e) =>
                    setFormProfile((prev) => ({ ...prev, avatar: e.target.value }))
                  }
                />
              </div>
              {errors.avatar && <span className={styles.errorText}>{errors.avatar}</span>}
            </div>

            {/* Display name */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="profile-display-name">
                  Имя пользователя
                </label>
                <span className={styles.charCount}>
                  {formProfile.displayName.length} / 50
                </span>
              </div>
              <input
                id="profile-display-name"
                type="text"
                maxLength={50}
                className={styles.input}
                placeholder="Например, Alex Rivers"
                value={formProfile.displayName}
                onChange={(e) =>
                  setFormProfile((prev) => ({ ...prev, displayName: e.target.value }))
                }
              />
              {errors.displayName && (
                <span className={styles.errorText}>{errors.displayName}</span>
              )}
            </div>

            {/* Username */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="profile-username">
                  Username (@handle)
                </label>
                <span className={styles.charCount}>
                  {formProfile.username.length} / 30
                </span>
              </div>
              <input
                id="profile-username"
                type="text"
                maxLength={30}
                className={styles.input}
                placeholder="username"
                value={formProfile.username}
                onChange={(e) =>
                  setFormProfile((prev) => ({ ...prev, username: e.target.value }))
                }
              />
              {errors.username && (
                <span className={styles.errorText}>{errors.username}</span>
              )}
            </div>

            {/* Bio */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="profile-bio">
                  О себе (Bio)
                </label>
                <span className={styles.charCount}>{formProfile.bio.length} / 160</span>
              </div>
              <textarea
                id="profile-bio"
                maxLength={160}
                className={styles.textarea}
                placeholder="Расскажите коротко о себе..."
                value={formProfile.bio}
                onChange={(e) =>
                  setFormProfile((prev) => ({ ...prev, bio: e.target.value }))
                }
              />
              {errors.bio && <span className={styles.errorText}>{errors.bio}</span>}
            </div>

            {/* Models Selector */}
            <div className={styles.field}>
              <div className={styles.sectionHeading}>
                <IconModels width={16} height={16} />
                <span className={styles.sectionHeadingTitle}>Используемые модели</span>
              </div>

              {/* Selected model chips */}
              {formProfile.models && formProfile.models.length > 0 ? (
                <div className={styles.selectedChipsWrap}>
                  {formProfile.models.map((id) => {
                    const info = resolveModelInfo(id, availableModels);
                    return (
                      <span key={id} className={styles.modelTag}>
                        <span className={styles.modelTagText}>
                          <strong>{info.name}</strong>
                          {info.provider ? <em>{info.provider}</em> : null}
                        </span>
                        <button
                          type="button"
                          className={styles.removeTagBtn}
                          onClick={() => removeModel(id)}
                          aria-label={`Удалить ${info.name}`}
                        >
                          <IconClose width={12} height={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {/* Search input for available models */}
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>
                  <IconSearch width={14} height={14} />
                </span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Найти и добавить модель из каталога..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                />
                {modelSearch && (
                  <button
                    type="button"
                    className={styles.clearSearch}
                    onClick={() => setModelSearch("")}
                    aria-label="Очистить"
                  >
                    <IconClose width={14} height={14} />
                  </button>
                )}
              </div>

              {modelSearch.trim() && (
                <div className={styles.searchResults}>
                  {searchResults.length === 0 ? (
                    <div className={styles.emptyResults}>Модели не найдены</div>
                  ) : (
                    searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={styles.resultItem}
                        onClick={() => addModel(m.id)}
                      >
                        <div className={styles.resultItemInfo}>
                          <span className={styles.resultItemName}>{m.name}</span>
                          <span className={styles.resultItemProvider}>{m.provider}</span>
                        </div>
                        <span className={styles.addIcon}>+</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Interests / Work Tags */}
            <div className={styles.field}>
              <div className={styles.sectionHeading}>
                <IconSparkles width={16} height={16} />
                <span className={styles.sectionHeadingTitle}>Занимаюсь (Интересы)</span>
              </div>
              <div className={styles.interestsWrap}>
                {DEFAULT_INTEREST_TAGS.map((tag) => {
                  const active = formProfile.interests?.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.interestToggleBtn} ${active ? styles.activeInterest : ""}`}
                      onClick={() => toggleInterest(tag)}
                    >
                      {active ? <IconCheck width={12} height={12} /> : null}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          {savedSuccess ? (
            <span className={styles.saveMsg}>✓ Изменения сохранены</span>
          ) : (
            <span />
          )}
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
