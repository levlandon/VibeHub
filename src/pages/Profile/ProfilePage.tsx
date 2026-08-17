import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/Button/Button";
import { IconButton } from "../../components/IconButton/IconButton";
import {
  IconClose,
  IconEdit,
  IconGithub,
  IconModels,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUpload,
  getInterestIcon,
} from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ProviderMark } from "../../components/ProviderMark/ProviderMark";
import { DEFAULT_INTEREST_TAGS, profileService } from "../../services/profile";
import { useHub } from "../../state/HubContext";
import type { Model } from "../../types/models";
import styles from "./ProfilePage.module.css";

interface ProfileDraft {
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  modelIds: string[];
  interests: string[];
}

function cleanModelName(rawName: string, provider?: string): string {
  let name = rawName.trim();
  // Strip "Provider: " (e.g. "OpenAI: GPT-5.6 Sol" -> "GPT-5.6 Sol")
  if (name.includes(": ")) {
    name = name.slice(name.indexOf(": ") + 2).trim();
  }
  // Strip "provider/" prefix if still present (e.g. "openai/gpt-4" -> "gpt-4")
  if (name.includes("/")) {
    name = name.slice(name.lastIndexOf("/") + 1).trim();
  }
  // If provider name is prefixed at the start without colon, e.g. "OpenAI GPT-4" -> "GPT-4"
  if (provider && name.toLowerCase().startsWith(provider.toLowerCase() + " ")) {
    name = name.slice(provider.length + 1).trim();
  }
  return name || rawName;
}

function getModelDisplay(id: string, availableModels: Model[]) {
  const found = availableModels.find((m) => m.id === id);
  if (found) {
    return {
      name: cleanModelName(found.name, found.provider),
      provider: found.provider,
      providerId: found.providerId,
      model: found,
    };
  }
  const parts = id.split("/");
  const provider = parts.length > 1 ? parts[0] : undefined;
  const rawName = parts.length > 1 ? parts.slice(1).join("/") : id;
  const displayName = cleanModelName(rawName, provider);
  return {
    name: displayName,
    provider,
    providerId: provider,
    model: { providerId: provider, provider, name: displayName },
  };
}

export function ProfilePage() {
  const {
    userProfile,
    updateUserProfile,
    authStatus,
    currentUser,
    setAuthModalOpen,
    openEntity,
    models,
  } = useHub();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: "",
    username: "",
    avatarUrl: "",
    bio: "",
    modelIds: [],
    interests: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const [modelPlacement, setModelPlacement] = useState<"bottom" | "top">("bottom");

  const modelPickerRef = useRef<HTMLDivElement>(null);
  const avatarPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const githubAvatar = currentUser?.avatarUrl;

  const handleToggleModelPicker = () => {
    if (showModelPicker) {
      setShowModelPicker(false);
      return;
    }
    if (modelPickerRef.current) {
      const rect = modelPickerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setModelPlacement("top");
      } else {
        setModelPlacement("bottom");
      }
    }
    setShowModelPicker(true);
  };

  // Close floating panels on click outside or Escape
  useEffect(() => {
    if (!showModelPicker && !showAvatarMenu) return;

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showModelPicker && modelPickerRef.current && !modelPickerRef.current.contains(target)) {
        setShowModelPicker(false);
      }
      if (showAvatarMenu && avatarPickerRef.current && !avatarPickerRef.current.contains(target)) {
        setShowAvatarMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModelPicker(false);
        setShowAvatarMenu(false);
      }
    };

    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModelPicker, showAvatarMenu]);

  const activeModelIds = isEditing
    ? draft.modelIds
    : userProfile.modelIds || userProfile.models || [];

  const activeInterests = isEditing
    ? draft.interests
    : userProfile.interests || [];

  const activeAvatar = isEditing
    ? draft.avatarUrl
    : userProfile.avatarUrl || userProfile.avatar || "";

  const activeDisplayName = isEditing ? draft.displayName : userProfile.displayName;
  const activeUsername = isEditing ? draft.username : userProfile.username;
  const activeBio = isEditing ? draft.bio : userProfile.bio;

  const initials = profileService.getInitials(activeDisplayName, activeUsername);

  const handleStartEdit = () => {
    setDraft({
      displayName: userProfile.displayName,
      username: userProfile.username,
      avatarUrl: userProfile.avatarUrl || userProfile.avatar || "",
      bio: userProfile.bio,
      modelIds: userProfile.modelIds || userProfile.models || [],
      interests: userProfile.interests || [],
    });
    setErrors({});
    setSaveError(null);
    setShowModelPicker(false);
    setShowAvatarMenu(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    setSaveError(null);
    setShowModelPicker(false);
    setShowAvatarMenu(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result;
      if (typeof res === "string") {
        setDraft((d) => ({ ...d, avatarUrl: res }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaveError(null);
    const validation = profileService.validateProfile({
      displayName: draft.displayName,
      username: draft.username,
      bio: draft.bio,
      avatarUrl: draft.avatarUrl,
      modelIds: draft.modelIds,
      interests: draft.interests,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      const ok = await updateUserProfile({
        displayName: draft.displayName,
        username: draft.username,
        bio: draft.bio,
        avatarUrl: draft.avatarUrl,
        modelIds: draft.modelIds,
        interests: draft.interests,
      });

      if (ok) {
        setIsEditing(false);
        setShowModelPicker(false);
        setShowAvatarMenu(false);
      } else {
        setSaveError("Не удалось сохранить профиль. Попробуйте еще раз.");
      }
    } catch {
      setSaveError("Произошла ошибка при сохранении профиля.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveModel = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      modelIds: prev.modelIds.filter((m) => m !== id),
    }));
  };

  const handleToggleModel = (id: string) => {
    setDraft((prev) => {
      const exists = prev.modelIds.includes(id);
      if (exists) {
        return { ...prev, modelIds: prev.modelIds.filter((m) => m !== id) };
      }
      if (prev.modelIds.length >= 8) return prev;
      return { ...prev, modelIds: [...prev.modelIds, id] };
    });
  };

  const handleToggleInterest = (tag: string) => {
    setDraft((prev) => {
      const exists = prev.interests.includes(tag);
      if (exists) {
        return { ...prev, interests: prev.interests.filter((i) => i !== tag) };
      }
      if (prev.interests.length >= 6) return prev;
      return { ...prev, interests: [...prev.interests, tag] };
    });
  };

  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models.slice(0, 40);
    const q = modelSearch.toLowerCase();
    return models
      .filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider?.toLowerCase().includes(q))
      .slice(0, 40);
  }, [models, modelSearch]);

  if (authStatus === "anonymous") {
    return (
      <div className={styles.page}>
        <PageHeader title="Профиль" />
        <div className={styles.anonymousCard}>
          <h2 className={styles.anonymousTitle}>Вы не авторизованы</h2>
          <p className={styles.anonymousDesc}>
            Войдите в аккаунт, чтобы просматривать и настраивать свой профиль, модели и направления деятельности.
          </p>
          <Button variant="primary" onClick={() => setAuthModalOpen(true)}>
            Войти в VibeHub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Профиль" />

      {saveError ? (
        <div className={styles.errorBanner}>{saveError}</div>
      ) : null}

      {/* Main Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.heroRow}>
          <div className={styles.userInfo}>
            {/* Avatar block */}
            <div className={styles.avatarWrap} ref={avatarPickerRef}>
              <div className={styles.avatar}>
                {activeAvatar ? (
                  <img
                    src={activeAvatar}
                    alt={activeDisplayName}
                    className={styles.avatarImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {isEditing ? (
                <>
                  <button
                    type="button"
                    className={`${styles.avatarEditBtn} ${showAvatarMenu ? styles.avatarEditBtnActive : ""}`}
                    title="Изменить аватар"
                    aria-label="Изменить аватар"
                    aria-haspopup="menu"
                    aria-expanded={showAvatarMenu}
                    onClick={() => setShowAvatarMenu((prev) => !prev)}
                  >
                    <IconEdit width={13} height={13} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />

                  {showAvatarMenu ? (
                    <div className={styles.avatarDropdown} role="menu">
                      <button
                        type="button"
                        className={styles.avatarMenuItem}
                        role="menuitem"
                        onClick={() => {
                          setShowAvatarMenu(false);
                          fileInputRef.current?.click();
                        }}
                      >
                        <IconUpload width={15} height={15} />
                        <span>Загрузить фото</span>
                      </button>

                      {githubAvatar && githubAvatar !== draft.avatarUrl ? (
                        <button
                          type="button"
                          className={styles.avatarMenuItem}
                          role="menuitem"
                          onClick={() => {
                            setDraft((d) => ({ ...d, avatarUrl: githubAvatar }));
                            setShowAvatarMenu(false);
                          }}
                        >
                          <IconGithub width={15} height={15} />
                          <span>Использовать аватар GitHub</span>
                        </button>
                      ) : null}

                      {draft.avatarUrl ? (
                        <button
                          type="button"
                          className={`${styles.avatarMenuItem} ${styles.avatarMenuDanger}`}
                          role="menuitem"
                          onClick={() => {
                            setDraft((d) => ({ ...d, avatarUrl: "" }));
                            setShowAvatarMenu(false);
                          }}
                        >
                          <IconTrash width={15} height={15} />
                          <span>Удалить фото</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            {/* Display Name & Username */}
            <div className={styles.names}>
              {isEditing ? (
                <div className={styles.editNameBlock}>
                  <div className={styles.inputWithCounter}>
                    <input
                      type="text"
                      className={`${styles.inlineInput} ${styles.nameInput} ${errors.displayName ? styles.hasError : ""}`}
                      value={draft.displayName}
                      maxLength={50}
                      placeholder="Имя пользователя"
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((d) => ({ ...d, displayName: val }));
                        if (errors.displayName) setErrors((err) => ({ ...err, displayName: undefined }));
                      }}
                    />
                    {draft.displayName.length >= 35 ? (
                      <span className={styles.counter}>{draft.displayName.length}/50</span>
                    ) : null}
                  </div>
                  {errors.displayName ? (
                    <span className={styles.fieldError}>{errors.displayName}</span>
                  ) : null}

                  <div className={styles.usernameRow}>
                    <span className={styles.atSign}>@</span>
                    <input
                      type="text"
                      className={`${styles.inlineInput} ${styles.usernameInput} ${errors.username ? styles.hasError : ""}`}
                      value={draft.username}
                      maxLength={30}
                      placeholder="username"
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^a-zA-Z0-9_-]/g, "");
                        setDraft((d) => ({ ...d, username: cleaned }));
                        if (errors.username) setErrors((err) => ({ ...err, username: undefined }));
                      }}
                    />
                  </div>
                  {errors.username ? (
                    <span className={styles.fieldError}>{errors.username}</span>
                  ) : null}
                </div>
              ) : (
                <>
                  <h2 className={styles.displayName}>{activeDisplayName}</h2>
                  <span className={styles.username}>@{activeUsername}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {isEditing ? (
          <div className={styles.bioEditWrap}>
            <label className={styles.fieldLabel}>О себе:</label>
            <div className={styles.textareaContainer}>
              <textarea
                className={`${styles.inlineTextarea} ${errors.bio ? styles.hasError : ""}`}
                value={draft.bio}
                maxLength={160}
                placeholder="Расскажите немного о себе и своих проектах..."
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((d) => ({ ...d, bio: val }));
                  if (errors.bio) setErrors((err) => ({ ...err, bio: undefined }));
                }}
              />
              <span
                className={`${styles.bioCounter} ${draft.bio.length >= 130 ? styles.bioCounterWarning : ""}`}
              >
                {draft.bio.length}/160
              </span>
            </div>
            {errors.bio ? <span className={styles.fieldError}>{errors.bio}</span> : null}
          </div>
        ) : activeBio ? (
          <p className={styles.bio}>{activeBio}</p>
        ) : null}
      </div>

      {/* 2-Column Sections Grid on Desktop */}
      <div className={styles.sectionsGrid}>
        {/* Used Models Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h3 className={styles.sectionTitle}>
              <IconModels width={18} height={18} />
              <span>Использую модели</span>
              {isEditing ? (
                <span className={styles.limitTag}>({activeModelIds.length}/8)</span>
              ) : null}
            </h3>
          </div>

          {activeModelIds.length === 0 ? (
            <p className={styles.emptyNote}>Модели не выбраны</p>
          ) : (
            <div className={styles.chipGrid}>
              {activeModelIds.map((id) => {
                const info = getModelDisplay(id, models);
                return isEditing ? (
                  <div key={id} className={styles.modelChip}>
                    <ProviderMark model={info.model} size={15} className={styles.modelMark} />
                    <span className={styles.modelName}>{info.name}</span>
                    <button
                      type="button"
                      className={styles.chipRemoveBtn}
                      title="Удалить модель"
                      aria-label="Удалить модель"
                      onClick={() => handleRemoveModel(id)}
                    >
                      <IconClose width={12} height={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.modelChip} ${styles.modelChipClickable}`}
                    title={`Перейти к модели ${info.name}`}
                    onClick={() => openEntity("model", id)}
                  >
                    <ProviderMark model={info.model} size={15} className={styles.modelMark} />
                    <span className={styles.modelName}>{info.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {isEditing ? (
            <div className={styles.pickerAnchor} ref={modelPickerRef}>
              <Button
                variant="ghost"
                disabled={draft.modelIds.length >= 8 && !showModelPicker}
                onClick={handleToggleModelPicker}
              >
                <IconPlus width={14} height={14} />
                <span>{showModelPicker ? "Закрыть каталог" : "Добавить модель"}</span>
              </Button>

              {showModelPicker ? (
                <div
                  className={`${styles.modelPickerPopover} ${modelPlacement === "top" ? styles.placeTop : styles.placeBottom}`}
                >
                  <div className={styles.pickerSearchSticky}>
                    <IconSearch width={15} height={15} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.pickerSearchInput}
                      placeholder="Поиск по каталогу моделей..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      autoFocus
                    />
                    {modelSearch ? (
                      <IconButton label="Очистить" onClick={() => setModelSearch("")}>
                        <IconClose width={13} height={13} />
                      </IconButton>
                    ) : null}
                  </div>

                  <div className={styles.modelPickerScrollList}>
                    {filteredModels.length === 0 ? (
                      <div className={styles.noResults}>Модели не найдены</div>
                    ) : (
                      filteredModels.map((m) => {
                        const selected = draft.modelIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            className={`${styles.popoverItem} ${selected ? styles.popoverItemSelected : ""}`}
                            onClick={() => handleToggleModel(m.id)}
                            disabled={!selected && draft.modelIds.length >= 8}
                          >
                            <span className={`${styles.checkbox} ${selected ? styles.checkboxChecked : ""}`}>
                              {selected ? "✓" : ""}
                            </span>
                            <div className={styles.pickerModelMeta}>
                              <span className={styles.pickerModelName}>{cleanModelName(m.name, m.provider)}</span>
                              {m.provider ? (
                                <span className={styles.pickerModelProvider}>{m.provider}</span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Interests Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h3 className={styles.sectionTitle}>
              <IconSparkles width={18} height={18} />
              <span>Занимаюсь</span>
              {isEditing ? (
                <span className={styles.limitTag}>({activeInterests.length}/6)</span>
              ) : null}
            </h3>
          </div>

          {/* View Mode: Compact Chips with Icons */}
          {!isEditing ? (
            activeInterests.length === 0 ? (
              <p className={styles.emptyNote}>Интересы не указаны</p>
            ) : (
              <div className={styles.chipGrid}>
                {activeInterests.map((tag) => {
                  const IconComp = getInterestIcon(tag);
                  return (
                    <div key={tag} className={styles.interestChip}>
                      <IconComp width={14} height={14} className={styles.interestIcon} />
                      <span>{tag}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Edit Mode: Inline Checklist of All Available Options with Icons */
            <div className={styles.interestChecklistInline}>
              {DEFAULT_INTEREST_TAGS.map((tag) => {
                const selected = draft.interests.includes(tag);
                const disabled = !selected && draft.interests.length >= 6;
                const IconComp = getInterestIcon(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`${styles.popoverItem} ${selected ? styles.popoverItemSelected : ""}`}
                    onClick={() => handleToggleInterest(tag)}
                    disabled={disabled}
                  >
                    <span className={`${styles.checkbox} ${selected ? styles.checkboxChecked : ""}`}>
                      {selected ? "✓" : ""}
                    </span>
                    <IconComp width={15} height={15} className={styles.checklistIcon} />
                    <span className={styles.popoverItemLabel}>{tag}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions Zone */}
      <div className={styles.bottomActions}>
        {!isEditing ? (
          <IconButton label="Редактировать профиль" onClick={handleStartEdit}>
            <IconEdit width={18} height={18} />
          </IconButton>
        ) : (
          <div className={styles.editActions}>
            <Button variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}




