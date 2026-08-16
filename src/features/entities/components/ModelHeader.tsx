import { memo, useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { IconButton } from "../../../components/IconButton/IconButton";
import { IconBookmark, IconCheck, IconCopy, IconOpen } from "../../../components/icons";
import { ProviderMark } from "../../../components/ProviderMark/ProviderMark";
import type { Model } from "../../../types/models";
import { ExpandableDescription } from "./ExpandableDescription";
import { ModelInfoPopover } from "./ModelInfoPopover";
import { ModelMeta } from "./ModelMeta";
import styles from "./ModelComponents.module.css";

export interface ModelHeaderProps {
  model: Model;
  saved: boolean;
  onSave: () => void;
}

export const ModelHeader = memo(function ModelHeader({
  model,
  saved,
  onSave,
}: ModelHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = useCallback(async () => {
    if (!model?.id) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(model.id);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = model.id;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.warn("Failed to copy model ID:", err);
    }
  }, [model?.id]);

  return (
    <header className={styles.modelHeader}>
      <div className={styles.headerTop}>
        <div className={styles.mainInfo}>
          <ProviderMark model={model} size={50} className={styles.providerLogo} />
          <div className={styles.titleArea}>
            <div className={styles.nameRow}>
              <h1 className={styles.modelTitle}>{model.name}</h1>
            </div>

            <div className={styles.subRow}>
              <Link
                to="/models"
                search={{ provider: model.provider }}
                className={styles.providerLink}
                title={`Показать все модели от ${model.provider}`}
              >
                <span>{model.provider}</span>
                <IconOpen width={12} height={12} className={styles.providerArrow} />
              </Link>
            </div>

            <div className={styles.idRow}>
              <span className={styles.idText} title="API Model ID">
                {model.id}
              </span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopyId}
                title={copied ? "Скопировано!" : "Скопировать Model ID"}
                aria-label={copied ? "ID модели скопирован" : "Скопировать Model ID"}
              >
                {copied ? (
                  <IconCheck width={13} height={13} className={styles.copiedIcon} />
                ) : (
                  <IconCopy width={13} height={13} />
                )}
              </button>

              <ModelInfoPopover model={model} copied={copied} onCopyId={handleCopyId} />
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <IconButton
            label={saved ? "Убрать из закладок" : "Сохранить"}
            active={saved}
            onClick={onSave}
          >
            <IconBookmark width={18} height={18} />
          </IconButton>
        </div>
      </div>

      {/* Main compact metadata area */}
      <ModelMeta model={model} />

      {/* Expandable description */}
      <ExpandableDescription description={model.description} />
    </header>
  );
});
