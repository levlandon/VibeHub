import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "../../components/Button/Button";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { IconButton } from "../../components/IconButton/IconButton";
import {
  IconEdit,
  IconGithub,
  IconModels,
  IconPlus,
  IconSearch,
  IconClose,
  IconSparkles,
  IconTrash,
  IconUpload,
} from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { ProfileSkeleton } from "../../components/Skeleton";
import {
  EditableInterestChip,
  EditableModelChip,
  ProfileInterestChip,
  ProfileModelChip,
} from "../../components/ProfileChips";
import { PostCard } from "../../features/community/PostCard";
import { PostDetailModal } from "../../features/community/PostDetailModal";
import { usePosts } from "../../features/posts";
import { cleanModelName } from "../../services/entities";
import { DEFAULT_INTEREST_TAGS, profileService } from "../../services/profile";
import { useHub } from "../../state/HubContext";
import { profileIdentifierFromPath, profilePath } from "../../state/routing";
import type { Model } from "../../types/models";
import type { UserProfile } from "../../types/profile";
import styles from "./ProfilePage.module.css";

interface ProfileDraft {
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  modelIds: string[];
  interests: string[];
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ProfilePage() {
  const navigate = useNavigate();
  const {
    userProfile,
    profileLoading,
    profileError,
    retryLoadProfile,
    updateUserProfile,
    authStatus,
    currentUser,
    setAuthModalOpen,
    openEntity,
    models,
  } = useHub();

  const { posts } = usePosts();

  const pathname = useLocation({ select: (location) => location.pathname });
  const targetIdentifier = profileIdentifierFromPath(pathname);

  const isSelf = useMemo(() => {
    if (!targetIdentifier) return true;
    if (currentUser?.id && targetIdentifier === currentUser.id) return true;
    if (currentUser?.handle && targetIdentifier.toLowerCase() === currentUser.handle.toLowerCase()) return true;
    if (userProfile?.id && targetIdentifier === userProfile.id) return true;
    if (userProfile?.username && targetIdentifier.toLowerCase() === userProfile.username.toLowerCase()) return true;
    return false;
  }, [targetIdentifier, currentUser, userProfile]);

  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSelf && targetIdentifier) {
      let active = true;
      setLoadingPublic(true);
      setNotFound(false);
      setPublicError(null);
      profileService
        .getProfile(targetIdentifier)
        .then((res) => {
          if (!active) return;
          if (res && res.id) {
            setPublicProfile(res);
            // Canonical replacement: If accessed via UUID, replace URL with /profile/<handle>
            if (UUID_REGEX.test(targetIdentifier) && res.username) {
              navigate({ to: profilePath(res.username), replace: true });
            }
          } else {
            setNotFound(true);
          }
        })
        .catch((err) => {
          if (!active) return;
          console.error("Failed to fetch public profile:", err);
          setPublicError(
            err instanceof Error ? err.message : "Не удалось загрузить профиль пользователя",
          );
        })
        .finally(() => {
          if (active) setLoadingPublic(false);
        });
      return () => {
        active = false;
      };
    } else {
      setPublicProfile(null);
      setNotFound(false);
      setPublicError(null);
      setLoadingPublic(false);
    }
  }, [isSelf, targetIdentifier, navigate]);

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

  // Compute active displayed profile
  const activeProfile = isSelf ? userProfile : publicProfile;
  const activeDisplayName = activeProfile?.displayName || (isSelf ? "Пользователь" : "Профиль");
  const activeUsername = activeProfile?.username || "user";
  const activeAvatarUrl = activeProfile?.avatarUrl || activeProfile?.avatar || "";
  const activeBio = activeProfile?.bio || "";
  const activeModelIds = activeProfile?.modelIds || activeProfile?.models || [];
  const activeInterests = activeProfile?.interests || [];

  // Filter user publications by exact author id or handle
  const activeUserId = isSelf
    ? userProfile?.id || currentUser?.id
    : publicProfile?.id;
  const activeUserHandle = isSelf
    ? userProfile?.username || currentUser?.handle
    : publicProfile?.username;

  const userPosts = useMemo(() => {
    return posts
      .filter((p) => {
        if (activeUserId && p.author.id === activeUserId) return true;
        if (
          activeUserHandle &&
          p.author.handle?.toLowerCase() === activeUserHandle.toLowerCase()
        ) {
          return true;
        }
        return false;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [posts, activeUserId, activeUserHandle]);

  const activeDetailPost = posts.find((p) => p.id === selectedPostId) || null;

  const handleStartEdit = () => {
    if (!userProfile) return;
    setDraft({
      displayName: userProfile.displayName,
      username: userProfile.username,
      avatarUrl: userProfile.avatarUrl || userProfile.avatar || "",
      bio: userProfile.bio || "",
      modelIds: [...(userProfile.modelIds || userProfile.models || [])],
      interests: [...(userProfile.interests || [])],
    });
    setErrors({});
    setSaveError(null);
    setShowModelPicker(false);
    setShowAvatarMenu(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowModelPicker(false);
    setShowAvatarMenu(false);
    setSaveError(null);
  };

  const handleToggleModel = (modelId: string) => {
    setDraft((d) => {
      const exists = d.modelIds.includes(modelId);
      if (exists) {
        return { ...d, modelIds: d.modelIds.filter((id) => id !== modelId) };
      }
      if (d.modelIds.length >= 8) return d;
      return { ...d, modelIds: [...d.modelIds, modelId] };
    });
  };

  const handleRemoveModel = (modelId: string) => {
    setDraft((d) => ({
      ...d,
      modelIds: d.modelIds.filter((id) => id !== modelId),
    }));
  };

  const handleToggleInterest = (interest: string) => {
    setDraft((d) => {
      const exists = d.interests.includes(interest);
      if (exists) {
        return { ...d, interests: d.interests.filter((i) => i !== interest) };
      }
      if (d.interests.length >= 6) return d;
      return { ...d, interests: [...d.interests, interest] };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((err) => ({ ...err, avatar: "Файл должен быть изображением" }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((err) => ({ ...err, avatar: "Размер изображения не должен превышать 2 МБ" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((d) => ({ ...d, avatarUrl: reader.result as string }));
        setShowAvatarMenu(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaveError(null);
    const validation = profileService.validateProfile(draft);
    if (!validation.valid) {
      setErrors(validation.errors as Partial<Record<keyof ProfileDraft, string>>);
      return;
    }

    setIsSaving(true);
    try {
      const ok = await updateUserProfile(draft);
      if (ok) {
        setIsEditing(false);
        setShowModelPicker(false);
        setShowAvatarMenu(false);
      } else {
        setSaveError("Не удалось сохранить профиль");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter models in picker
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models;
    const q = modelSearch.toLowerCase().trim();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.provider && m.provider.toLowerCase().includes(q)) ||
        m.id.toLowerCase().includes(q),
    );
  }, [models, modelSearch]);

  const initials = profileService.getInitials(
    isEditing ? draft.displayName : activeDisplayName,
    isEditing ? draft.username : activeUsername,
  );

  // Loading States
  if (isSelf && profileLoading) {
    return (
      <div className={styles.page}>
        <PageHeader title="Профиль" />
        <ProfileSkeleton />
      </div>
    );
  }

  if (!isSelf && loadingPublic) {
    return (
      <div className={styles.page}>
        <PageHeader title="Профиль" />
        <ProfileSkeleton />
      </div>
    );
  }

  // Not Found State
  if (!isSelf && notFound) {
    return (
      <div className={styles.page}>
        <PageHeader title="Профиль не найден" />
        <EmptyState>
          <p>Пользователь с идентификатором &laquo;{targetIdentifier}&raquo; не найден.</p>
          <Button variant="ghost" style={{ marginTop: 12 }} onClick={() => navigate({ to: "/models" })}>
            Вернуться в каталог
          </Button>
        </EmptyState>
      </div>
    );
  }

  // Anonymous Guest viewing own profile prompt
  if (isSelf && authStatus === "anonymous" && !userProfile) {
    return (
      <div className={styles.page}>
        <PageHeader title="Профиль" />
        <div className={styles.anonymousCard}>
          <h2 className={styles.anonymousTitle}>Войдите в аккаунт</h2>
          <p className={styles.anonymousDesc}>
            Войдите через GitHub, чтобы настроить свой профиль, указать стек моделей и интересы.
          </p>
          <Button variant="primary" onClick={() => setAuthModalOpen(true)}>
            <IconGithub width={16} height={16} />
            <span>Войти через GitHub</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={isSelf ? "Мой профиль" : activeDisplayName} />

      {profileError || publicError || saveError ? (
        <div className={styles.errorBanner}>
          {profileError || publicError || saveError}
          {profileError ? (
            <Button variant="ghost" style={{ marginLeft: 12 }} onClick={retryLoadProfile}>
              Повторить
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Main Profile Header Card */}
      <div className={styles.profileCard}>
        <div className={styles.heroRow}>
          <div className={styles.userInfo}>
            {/* Avatar & Photo Picker */}
            <div className={styles.avatarWrap} ref={avatarPickerRef}>
              <div className={styles.avatar}>
                {(isEditing ? draft.avatarUrl : activeAvatarUrl) ? (
                  <img
                    src={isEditing ? draft.avatarUrl : activeAvatarUrl}
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
                    className={styles.avatarEditOverlay}
                    title="Изменить фото"
                    aria-label="Изменить фото"
                    onClick={() => setShowAvatarMenu((prev) => !prev)}
                  >
                    <IconUpload width={16} height={16} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />

                  {showAvatarMenu ? (
                    <div className={styles.avatarMenu} role="menu">
                      <button
                        type="button"
                        className={styles.avatarMenuItem}
                        role="menuitem"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAvatarMenu(false);
                        }}
                      >
                        <IconUpload width={15} height={15} />
                        <span>Загрузить фото</span>
                      </button>

                      {githubAvatar ? (
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

          {/* Single Edit Affordance (Pencil Icon) in Top-Right of Profile Surface */}
          {isSelf && authStatus === "authenticated" && !isEditing ? (
            <IconButton
              label="Редактировать профиль"
              title="Редактировать"
              onClick={handleStartEdit}
            >
              <IconEdit width={18} height={18} />
            </IconButton>
          ) : null}
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

      {/* 2-Column Compact About Grid (Models & Interests) */}
      <div className={styles.sectionsGrid}>
        {/* Used Models Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h3 className={styles.sectionTitle}>
              <IconModels width={17} height={17} />
              <span>Использую модели</span>
              {isEditing ? (
                <span className={styles.limitTag}>({draft.modelIds.length}/8)</span>
              ) : null}
            </h3>
          </div>

          {!isEditing ? (
            activeModelIds.length === 0 ? (
              <p className={styles.emptyNote}>Модели не выбраны</p>
            ) : (
              <div className={styles.chipGrid}>
                {activeModelIds.map((id) => {
                  const info = getModelDisplay(id, models);
                  return (
                    <ProfileModelChip
                      key={id}
                      name={info.name}
                      provider={info.provider}
                      model={info.model}
                      clickable={true}
                      onClick={() => openEntity("model", id)}
                    />
                  );
                })}
              </div>
            )
          ) : (
            <>
              {draft.modelIds.length > 0 ? (
                <div className={styles.chipGrid}>
                  {draft.modelIds.map((id) => {
                    const info = getModelDisplay(id, models);
                    return (
                      <EditableModelChip
                        key={id}
                        name={info.name}
                        provider={info.provider}
                        model={info.model}
                        onRemove={() => handleRemoveModel(id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyNote}>Модели не выбраны</p>
              )}

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
            </>
          )}
        </div>

        {/* Interests Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeaderRow}>
            <h3 className={styles.sectionTitle}>
              <IconSparkles width={17} height={17} />
              <span>Занимаюсь</span>
              {isEditing ? (
                <span className={styles.limitTag}>({draft.interests.length}/6)</span>
              ) : null}
            </h3>
          </div>

          {/* View Mode vs Edit Mode */}
          {!isEditing ? (
            activeInterests.length === 0 ? (
              <p className={styles.emptyNote}>Интересы не указаны</p>
            ) : (
              <div className={styles.chipGrid}>
                {activeInterests.map((tag) => (
                  <ProfileInterestChip key={tag} tag={tag} />
                ))}
              </div>
            )
          ) : (
            /* Edit Mode: Compact Rounded Selectable Chips */
            <div className={styles.chipGrid}>
              {DEFAULT_INTEREST_TAGS.map((tag) => {
                const selected = draft.interests.includes(tag);
                const disabled = !selected && draft.interests.length >= 6;
                return (
                  <EditableInterestChip
                    key={tag}
                    tag={tag}
                    selected={selected}
                    disabled={disabled}
                    onToggle={() => handleToggleInterest(tag)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Publications Section (Directly below about grid, single vertical page) */}
      {!isEditing ? (
        <section className={styles.publicationsSection} aria-label="Публикации">
          <div className={styles.publicationsHeader}>
            <h3 className={styles.publicationsHeading}>
              <span>Публикации</span>
              <span className={styles.publicationsCount}>({userPosts.length})</span>
            </h3>
          </div>

          {userPosts.length === 0 ? (
            <EmptyState>
              <p>
                {isSelf
                  ? "У вас пока нет публикаций."
                  : "У пользователя пока нет публикаций."}
              </p>
            </EmptyState>
          ) : (
            <ul className={styles.postsList}>
              {userPosts.map((post) => (
                <li key={post.id} className={styles.postsGridItem}>
                  <PostCard
                    post={post}
                    onClick={() => setSelectedPostId(post.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Edit Mode Bottom Actions */}
      {isEditing ? (
        <div className={styles.bottomActions}>
          <div className={styles.editActions}>
            <Button variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Post Detail Modal */}
      {activeDetailPost ? (
        <PostDetailModal
          post={activeDetailPost}
          allPosts={posts}
          onClose={() => setSelectedPostId(null)}
          onSelectPost={setSelectedPostId}
        />
      ) : null}
    </div>
  );
}
