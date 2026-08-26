import { useCallback, useEffect, useState } from "react";
import { postTypeConfig } from "../../config/postTypes";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconClose } from "../../components/icons";
import { isDraftDirty, useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useHub } from "../../state/HubContext";
import { usePosts } from "../posts";
import type { PostType } from "../../types/posts";
import { initialDraft } from "./draft";
import { PostComposer } from "./PostComposer";
import { PostTypeSelector } from "./PostTypeSelector";
import type { PostDraft, ShareView } from "./types";
import styles from "./ShareDialog.module.css";

export function ShareDialog() {
  const { addOpen, setAddOpen, mentionEntities } = useHub();
  const { publishPost } = usePosts();
  const [view, setView] = useState<ShareView>({ step: "selecting-type" });
  const [draft, setDraft] = useState<PostDraft>(initialDraft("discussion"));
  const [baseline, setBaseline] = useState<PostDraft>(initialDraft("discussion"));

  const composing = view.step === "composing";
  const dirty = composing && isDraftDirty(draft, baseline);
  const leave = useUnsavedChanges(dirty);

  useEffect(() => {
    if (!addOpen) {
      setView({ step: "selecting-type" });
      setDraft(initialDraft("discussion"));
      setBaseline(initialDraft("discussion"));
    }
  }, [addOpen]);

  const closeNow = useCallback(() => setAddOpen(false), [setAddOpen]);

  const backNow = () => {
    setView({ step: "selecting-type" });
    setDraft(initialDraft("discussion"));
    setBaseline(initialDraft("discussion"));
  };

  const requestClose = useCallback(() => {
    if (leave.intent) return;
    if (leave.request("close")) closeNow();
  }, [leave, closeNow]);

  const requestBack = () => {
    if (leave.intent) return;
    if (leave.request("back")) backNow();
  };

  const applyLeave = () => {
    const intent = leave.confirm();
    if (intent === "close") closeNow();
    if (intent === "back") backNow();
  };

  const pickType = (type: PostType) => {
    const next = initialDraft(type);
    setDraft(next);
    setBaseline(next);
    setView({ step: "composing", type });
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
  }, [addOpen, dirty, leave, requestClose]);

  if (!addOpen) return null;

  const title = view.step === "composing" ? postTypeConfig(view.type).composeTitle : "Поделиться";

  return (
    <div className={styles.overlay} onClick={requestClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={composing ? styles.headerCompose : styles.header}>
          {view.step === "composing" ? (
            <button
              type="button"
              className={styles.back}
              aria-label="К выбору типа"
              onClick={requestBack}
            >
              ←
            </button>
          ) : null}
          <h2 id="share-title">{title}</h2>
          <IconButton label="Закрыть" onClick={requestClose}>
            <IconClose width={18} height={18} />
          </IconButton>
        </header>

        {view.step === "selecting-type" ? (
          <PostTypeSelector onPick={pickType} />
        ) : (
          <PostComposer
            type={view.type}
            draft={draft}
            onChange={setDraft}
            onSubmit={(input) => {
              publishPost(input, mentionEntities);
              closeNow();
            }}
          />
        )}

        {leave.intent ? (
          <ConfirmDialog
            title="Отменить публикацию?"
            body="Несохранённые изменения будут потеряны."
            cancelLabel="Продолжить редактирование"
            confirmLabel="Отменить публикацию"
            onCancel={leave.dismiss}
            onConfirm={applyLeave}
          />
        ) : null}
      </div>
    </div>
  );
}

