import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconClose } from "../../components/icons";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useHub } from "../../state/HubContext";
import { useI18n } from "../../i18n";
import { usePosts } from "../posts";
import {
  buildCreatePostInput,
  isComposerDirty,
  resolveEntitiesFromContent,
} from "./composerUtils";
import { PostComposer } from "./PostComposer";
import { emptyComposerState, type ComposerState } from "./types";
import styles from "./ShareDialog.module.css";

export function ShareDialog() {
  const { t } = useI18n();
  const {
    addOpen,
    setAddOpen,
    composerOptions,
    mentionEntities,
    authStatus,
    setAuthModalOpen,
  } = useHub();
  const { publishPost, isMutating } = usePosts();

  useScrollLock(addOpen);

  const [state, setState] = useState<ComposerState>(() =>
    emptyComposerState(),
  );
  const [baseline, setBaseline] = useState<ComposerState>(() =>
    emptyComposerState(),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset state when modal opens/closes or options change
  useEffect(() => {
    if (addOpen) {
      const initialText = composerOptions?.initialText ?? "";
      const entity = composerOptions?.entity;
      const entityMention = entity ? `@${entity.name} ` : "";
      const content =
        entity && !initialText.includes(`@${entity.name}`)
          ? `${entityMention}${initialText}`.trim() + " "
          : initialText;

      const initial = emptyComposerState({
        content,
        type: composerOptions?.type ?? "discussion",
        category: composerOptions?.category,
        link: composerOptions?.link,
        entities: entity ? [entity] : [],
      });
      setState(initial);
      setBaseline(initial);
      setSubmitError(null);
      setIsSubmitting(false);
    } else {
      const empty = emptyComposerState();
      setState(empty);
      setBaseline(empty);
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [addOpen, composerOptions]);

  const dirty = isComposerDirty(state, baseline);
  const leave = useUnsavedChanges(dirty);

  const closeNow = useCallback(() => {
    setAddOpen(false);
  }, [setAddOpen]);

  const requestClose = useCallback(() => {
    if (leave.intent) return;
    if (leave.request("close")) {
      closeNow();
    }
  }, [leave, closeNow]);

  const applyLeave = () => {
    const intent = leave.confirm();
    if (intent === "close" || intent === "back") {
      closeNow();
    }
  };

  const handlePublish = async (submittedState: ComposerState = state) => {
    if (isSubmitting || isMutating) return;

    if (authStatus !== "authenticated") {
      setAuthModalOpen(true);
      return;
    }

    const input = buildCreatePostInput(submittedState);
    if (!input.content.trim() && submittedState.entities.length === 0) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Extract structured entity references strictly from current text (no stale mentions)
      const currentEntities = resolveEntitiesFromContent(
        submittedState.content,
        mentionEntities,
        submittedState.entities,
      );

      await publishPost(input, currentEntities);
      closeNow();
    } catch {
      setSubmitError(t("feed.publishError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!addOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (leave.intent) {
        leave.dismiss();
        return;
      }
      requestClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, leave, requestClose]);

  if (!addOpen) return null;

  return (
    <div className={styles.overlay} onClick={requestClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="composer-title" className={styles.headerTitle}>
            {t("composer.newPost")}
          </h2>
          <IconButton label={t("common.close")} onClick={requestClose}>
            <IconClose width={18} height={18} />
          </IconButton>
        </header>

        {submitError ? (
          <div className={styles.errorBanner} role="alert">
            {submitError}
          </div>
        ) : null}

        <PostComposer
          state={state}
          onChange={setState}
          onSubmit={handlePublish}
          disabled={isSubmitting || isMutating}
          autoFocus={true}
        />

        {leave.intent ? (
          <ConfirmDialog
            title={t("composer.discardTitle")}
            body={t("composer.discardBody")}
            cancelLabel={t("composer.continueEditing")}
            confirmLabel={t("common.delete")}
            confirmVariant="danger"
            onCancel={leave.dismiss}
            onConfirm={applyLeave}
          />
        ) : null}
      </div>
    </div>
  );
}
