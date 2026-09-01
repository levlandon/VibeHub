import { memo, type KeyboardEvent } from "react";
import { IconButton } from "../IconButton/IconButton";
import {
  IconAudio,
  IconBookmark,
  IconBrain,
  IconLayers,
  IconTools,
  IconVision,
} from "../icons";
import { ProviderMark } from "../ProviderMark/ProviderMark";
import type { Model } from "../../types/models";
import { formatFullDate, formatModelDate } from "../../utils/dateFormat";
import styles from "./ModelRow.module.css";
import { useI18n } from "../../i18n";

export interface ModelRowProps {
  model: Model;
  bookmarked: boolean;
  onBookmark: () => void;
  onOpen: () => void;
}

export const ModelRow = memo(function ModelRow({
  model,
  bookmarked,
  onBookmark,
  onOpen,
}: ModelRowProps) {
  const { language, t } = useI18n();
  const hasReasoning = model.capabilities.includes("Reasoning");
  const hasVision = model.capabilities.includes("Vision");
  const hasTools = model.capabilities.includes("Tools");
  const hasAudio = model.capabilities.includes("Audio");
  const hasCompletePricing =
    model.pricing.promptPerMillion !== null &&
    model.pricing.completionPerMillion !== null;
  const pricingSummary = model.pricing.isFree
    ? t("model.free")
    : hasCompletePricing
      ? model.pricing.formattedSummary
      : t("models.priceUnavailable");

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      aria-label={t("models.openModel", { name: model.name, provider: model.provider })}
    >
      <ProviderMark model={model} />
      <div className={styles.body}>
        <h2 className={styles.name}>{model.name}</h2>
        <p className={styles.provider}>{model.provider}</p>
        <div className={styles.metaRow}>
          <span
            className={styles.contextWindow}
            title={t("models.contextWindow", { count: model.contextLength.toLocaleString(language === "ru" ? "ru-RU" : "en-US") })}
          >
            <IconLayers width={14} height={14} className={styles.metaIcon} aria-hidden />
            <span>{model.contextWindow}</span>
          </span>
          <span
            className={`${styles.pricing} ${model.pricing.isFree ? styles.pricingFree : ""}`}
            title={
              model.pricing.isFree
                ? t("models.freeModel")
                : model.pricing.promptPerMillion !== null &&
                    model.pricing.completionPerMillion !== null
                  ? t("models.price", { prompt: model.pricing.promptPerMillion.toFixed(2), completion: model.pricing.completionPerMillion.toFixed(2) })
                  : t("models.priceUnavailable")
            }
          >
            {pricingSummary}
          </span>
          {hasReasoning || hasVision || hasTools || hasAudio ? (
            <div className={styles.capabilities} aria-label={t("models.capabilities")}>
              {hasReasoning ? (
                <span className={styles.capIcon} title={t("models.reasoningTitle")} aria-label={t("models.reasoning")}>
                  <IconBrain width={15} height={15} />
                </span>
              ) : null}
              {hasVision ? (
                <span className={styles.capIcon} title={t("models.visionTitle")} aria-label={t("models.vision")}>
                  <IconVision width={15} height={15} />
                </span>
              ) : null}
              {hasTools ? (
                <span className={styles.capIcon} title={t("models.toolsTitle")} aria-label={t("models.tools")}>
                  <IconTools width={15} height={15} />
                </span>
              ) : null}
              {hasAudio ? (
                <span className={styles.capIcon} title={t("models.audioTitle")} aria-label={t("models.audio")}>
                  <IconAudio width={15} height={15} />
                </span>
              ) : null}
            </div>
          ) : null}
          {model.releaseDate ? (
            <span
              className={styles.date}
              title={formatFullDate(model.releaseDate, language === "ru" ? "ru-RU" : "en-US")}
            >
              {formatModelDate(model.releaseDate, new Date().getFullYear(), language === "ru" ? "ru-RU" : "en-US")}
            </span>
          ) : null}
        </div>
      </div>
      <div
        className={styles.actions}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <IconButton
          label={bookmarked ? t("saved.removeBookmark") : t("common.save")}
          active={bookmarked}
          onClick={(e) => {
            e.stopPropagation();
            onBookmark();
          }}
        >
          <IconBookmark width={18} height={18} />
        </IconButton>
      </div>
    </article>
  );
});
