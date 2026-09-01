import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconClose,
  IconCode,
  IconLink,
  IconQuestion,
  IconSend,
  IconTag,
} from "../../components/icons";
import { MentionEditor } from "../../components/mentions/MentionEditor";
import { POST_TYPES } from "../../config/postTypes";
import { profileService } from "../../services/profile";
import { useHub } from "../../state/HubContext";
import { useI18n } from "../../i18n";
import type { EntityRef } from "../../types/entities";
import type { PostTopicCategory, PostType } from "../../types/posts";
import {
  commitPendingLink,
  formatUrlPreview,
  resolveEntitiesFromContent,
} from "./composerUtils";
import type { ComposerState } from "./types";
import styles from "./PostComposer.module.css";

const TOPIC_CATEGORIES: { id: PostTopicCategory; label: string }[] = [
  { id: "models", label: "composer.models" },
  { id: "tools", label: "composer.tools" },
  { id: "agents", label: "composer.agents" },
  { id: "mcp", label: "feed.mcp" },
];

export function getPostTypeIcon(type: PostType, size = 15) {
  switch (type) {
    case "discussion":
      return <IconChat width={size} height={size} />;
    case "question":
      return <IconQuestion width={size} height={size} />;
    case "project":
      return <IconCode width={size} height={size} />;
    case "guide":
      return <IconBook width={size} height={size} />;
    case "resource":
      return <IconLink width={size} height={size} />;
    default:
      return <IconChat width={size} height={size} />;
  }
}

export interface PostComposerProps {
  state: ComposerState;
  onChange: (state: ComposerState) => void;
  onSubmit: (state: ComposerState) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PostComposer({
  state,
  onChange,
  onSubmit,
  disabled = false,
  autoFocus = true,
}: PostComposerProps) {
  const { t } = useI18n();
  const { userProfile, mentionEntities } = useHub();

  const [activePopover, setActivePopover] = useState<"category" | null>(null);
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState(state.link ?? "");
  const [linkError, setLinkError] = useState(false);

  const linkInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const canPublish = Boolean(
    state.content.trim().length > 0 || state.entities.length > 0,
  );

  // Sync link input value when state.link changes externally
  useEffect(() => {
    if (state.link) {
      setLinkInputValue(state.link);
    }
  }, [state.link]);

  // Focus link input when opened
  useEffect(() => {
    if (isLinkInputOpen) {
      setTimeout(() => linkInputRef.current?.focus(), 40);
    }
  }, [isLinkInputOpen]);

  // Close popovers and inline link input on outside click or Escape
  useEffect(() => {
    if (!activePopover && !isLinkInputOpen) return;

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(target) &&
        linkInputRef.current &&
        !linkInputRef.current.contains(target)
      ) {
        if (activePopover) {
          setActivePopover(null);
        }
      }
    };

    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (activePopover) {
          setActivePopover(null);
        } else if (isLinkInputOpen) {
          setIsLinkInputOpen(false);
          setLinkInputValue("");
          setLinkError(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey, true); // Capture phase to prevent closing dialog
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [activePopover, isLinkInputOpen]);

  const handleSetContent = (content: string, entities?: EntityRef[]) => {
    const syncedEntities =
      entities ??
      resolveEntitiesFromContent(
        content,
        mentionEntities,
        state.entities,
      );
    onChange({ ...state, content, entities: syncedEntities });
  };

  const handleSelectType = (type: PostType) => {
    onChange({ ...state, type });
    setActivePopover(null);
  };

  const handleSelectCategory = (cat?: PostTopicCategory) => {
    onChange({ ...state, category: cat });
    setActivePopover(null);
  };

  const handleToggleLinkInput = () => {
    if (state.link) {
      setLinkInputValue(state.link);
      setIsLinkInputOpen(true);
      setLinkError(false);
    } else {
      setIsLinkInputOpen((prev) => {
        const next = !prev;
        if (next) {
          setLinkInputValue("");
          setLinkError(false);
        }
        return next;
      });
    }
  };

  const handleConfirmLink = () => {
    const result = commitPendingLink(state, linkInputValue);
    if (result.status === "empty") {
      setIsLinkInputOpen(false);
      setLinkError(false);
      return;
    }
    if (result.status === "invalid") {
      setLinkError(true);
      return;
    }

    onChange(result.state);
    setIsLinkInputOpen(false);
    setLinkInputValue("");
    setLinkError(false);
  };

  const handleCancelLinkInput = () => {
    setIsLinkInputOpen(false);
    setLinkInputValue("");
    setLinkError(false);
  };

  const handleRemoveLink = () => {
    onChange({ ...state, link: undefined });
    setLinkInputValue("");
    setLinkError(false);
    setIsLinkInputOpen(false);
  };

  const handleLinkInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmLink();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCancelLinkInput();
    }
  };

  const handleSubmit = () => {
    if (!canPublish || disabled) return;

    // Commit a valid draft before publishing and pass the resulting state
    // directly to the caller. This avoids publishing stale React state.
    const result = commitPendingLink(
      state,
      isLinkInputOpen ? linkInputValue : "",
    );
    if (result.status === "invalid") {
      setLinkError(true);
      return;
    }

    if (result.status === "attached") {
      onChange(result.state);
      setIsLinkInputOpen(false);
      setLinkInputValue("");
      setLinkError(false);
    }

    onSubmit(result.state);
  };

  const currentTypeLabel = t(`composer.${state.type}`);
  const initials = profileService.getInitials(
    userProfile?.displayName,
    userProfile?.username,
  );

  const activeCategoryLabel = state.category
    ? (() => {
        const key = TOPIC_CATEGORIES.find((c) => c.id === state.category)?.label;
        return key ? t(key) : null;
      })()
    : null;

  return (
    <div className={styles.composer}>
      {/* User row */}
      {userProfile ? (
        <div className={styles.userRow}>
          <div className={styles.avatar}>
            {userProfile.avatarUrl || userProfile.avatar ? (
              <img
                src={userProfile.avatarUrl || userProfile.avatar}
                alt={userProfile.displayName}
                className={styles.avatarImg}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userProfile.displayName}</span>
            <span className={styles.userHandle}>@{userProfile.username}</span>
          </div>
        </div>
      ) : null}

      {/* Main Contenteditable Editor */}
      <div className={styles.textareaWrap}>
        <MentionEditor
          value={state.content}
          onChange={handleSetContent}
          placeholder={t("composer.placeholder")}
          autoFocus={autoFocus}
          disabled={disabled}
          onSubmit={handleSubmit}
          aria-label={t("composer.contentLabel")}
        />
      </div>

      {/* Inline Link Input Row */}
      {isLinkInputOpen && !state.link ? (
        <div className={styles.inlineLinkGroup}>
          <div className={styles.inlineLinkRow}>
            <span className={styles.inlineLinkIcon}>
              <IconLink width={14} height={14} />
            </span>
            <input
              ref={linkInputRef}
              type="url"
              className={`${styles.inlineLinkInput} ${
                linkError ? styles.inlineLinkInputError : ""
              }`}
              value={linkInputValue}
              onChange={(e) => {
                setLinkInputValue(e.target.value);
                if (linkError) setLinkError(false);
              }}
              onKeyDown={handleLinkInputKeyDown}
              placeholder={t("composer.link.placeholder")}
              aria-label={t("composer.link.aria")}
              aria-invalid={linkError}
              aria-describedby={linkError ? "post-link-error" : undefined}
            />
            <button
              type="button"
              className={styles.inlineLinkClose}
              onClick={handleCancelLinkInput}
              aria-label={t("composer.link.cancel")}
              title={t("common.cancel")}
            >
              <IconClose width={13} height={13} />
            </button>
          </div>
          {linkError ? (
            <p id="post-link-error" className={styles.inlineLinkError} role="alert">
              {t("composer.link.invalid")}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Unified Attachments & Chips Area (strictly for non-text attachments: links, non-default category/type) */}
      {(state.link ||
        state.type !== "discussion" ||
        state.category) ? (
        <div className={styles.attachmentsArea}>
          {/* Attached Link */}
          {state.link ? (
            <div className={`${styles.chip} ${styles.chipLink}`}>
              <span className={styles.chipIcon}>
                <IconLink width={13} height={13} />
              </span>
              <span className={styles.chipText}>
                {formatUrlPreview(state.link)}
              </span>
              <button
                type="button"
                className={styles.chipClose}
                onClick={handleRemoveLink}
                aria-label={t("composer.link.remove")}
                title={t("composer.link.remove")}
              >
                ×
              </button>
            </div>
          ) : null}

          {/* Selected Non-default Type */}
          {state.type !== "discussion" ? (
            <div className={`${styles.chip} ${styles.chipType}`}>
              <span className={styles.chipIcon}>
                {getPostTypeIcon(state.type, 13)}
              </span>
              <span className={styles.chipText}>
                {currentTypeLabel}
              </span>
              <button
                type="button"
                className={styles.chipClose}
                onClick={() => handleSelectType("discussion")}
                aria-label={t("composer.discussion")}
                title={t("composer.discussion")}
              >
                ×
              </button>
            </div>
          ) : null}

          {/* Selected Category */}
          {activeCategoryLabel ? (
            <div className={`${styles.chip} ${styles.chipType}`}>
              <span className={styles.chipText}>#{activeCategoryLabel}</span>
              <button
                type="button"
                className={styles.chipClose}
                onClick={() => handleSelectCategory(undefined)}
                aria-label={t("composer.topic")}
                title={t("composer.topic")}
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Bottom Toolbar */}
      <footer ref={toolbarRef} className={styles.toolbar}>
        <div className={styles.toolActions}>
          {/* Link Action */}
          <button
            type="button"
            className={`${styles.actionBtn} ${
              state.link || isLinkInputOpen ? styles.actionBtnActive : ""
            }`}
            onClick={handleToggleLinkInput}
            title={state.link ? t("composer.link.attached") : t("composer.link.attach")}
            aria-label={t("composer.link.attach")}
          >
            <IconLink width={16} height={16} />
            <span>{t("composer.link")}</span>
          </button>

          {/* Category Action */}
          <button
            type="button"
            className={`${styles.actionBtn} ${
              state.type !== "discussion" ||
              state.category ||
              activePopover === "category"
                ? styles.actionBtnActive
                : ""
            }`}
            onClick={() =>
              setActivePopover((prev) =>
                prev === "category" ? null : "category",
              )
            }
            title={t("composer.category.select")}
            aria-label={t("composer.category.aria")}
            aria-haspopup="dialog"
            aria-expanded={activePopover === "category"}
          >
            {state.type !== "discussion" ? (
              getPostTypeIcon(state.type, 16)
            ) : (
              <IconTag width={16} height={16} />
            )}
            <span>
              {state.type !== "discussion"
                ? currentTypeLabel
                : activeCategoryLabel
                ? activeCategoryLabel
                : t("composer.category")}
            </span>
          </button>

          {/* Category Popover */}
          {activePopover === "category" ? (
            <div
              className={styles.popover}
              role="dialog"
              aria-label={t("composer.category.dialog")}
            >
              <div className={styles.popoverSectionTitle}>{t("composer.type")}</div>
              <ul className={styles.popoverList}>
                {POST_TYPES.map((item) => {
                  const isSelected = state.type === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`${styles.popoverItem} ${
                          isSelected ? styles.popoverItemSelected : ""
                        }`}
                        onClick={() => handleSelectType(item.id)}
                      >
                        <span className={styles.popoverItemLabel}>
                          <span className={styles.popoverItemIcon}>
                            {getPostTypeIcon(item.id, 15)}
                          </span>
                          <span>{t(`composer.${item.id}`)}</span>
                        </span>
                        {isSelected ? (
                          <IconCheck width={13} height={13} />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.popoverDivider} />

              <div className={styles.popoverSectionTitle}>{t("composer.topic")}</div>
              <ul className={styles.popoverList}>
                <li>
                  <button
                    type="button"
                    className={`${styles.popoverItem} ${
                      !state.category ? styles.popoverItemSelected : ""
                    }`}
                    onClick={() => handleSelectCategory(undefined)}
                  >
                    <span className={styles.popoverItemLabel}>
                      <span>{t("composer.noTopic")}</span>
                    </span>
                    {!state.category ? (
                      <IconCheck width={13} height={13} />
                    ) : null}
                  </button>
                </li>
                {TOPIC_CATEGORIES.map((c) => {
                  const isSelected = state.category === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={`${styles.popoverItem} ${
                          isSelected ? styles.popoverItemSelected : ""
                        }`}
                        onClick={() => handleSelectCategory(c.id)}
                      >
                        <span className={styles.popoverItemLabel}>
                          <span>{t(c.label)}</span>
                        </span>
                        {isSelected ? (
                          <IconCheck width={13} height={13} />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Submit Group with Arrow Up Send Button */}
        <div className={styles.submitGroup}>
          <span className={styles.shortcutHint} title={t("composer.shortcut")}>
            Ctrl+Enter
          </span>
          <button
            type="button"
            className={styles.sendBtn}
            disabled={disabled || !canPublish}
            onClick={handleSubmit}
            title={t("composer.publishWithShortcut")}
            aria-label={t("composer.publish")}
          >
            <IconSend width={17} height={17} />
          </button>
        </div>
      </footer>
    </div>
  );
}
