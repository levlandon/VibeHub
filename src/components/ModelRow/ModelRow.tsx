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
  const hasReasoning = model.capabilities.includes("Reasoning");
  const hasVision = model.capabilities.includes("Vision");
  const hasTools = model.capabilities.includes("Tools");
  const hasAudio = model.capabilities.includes("Audio");

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
      aria-label={`Открыть модель ${model.name} (${model.provider})`}
    >
      <ProviderMark model={model} />
      <div className={styles.body}>
        <h2 className={styles.name}>{model.name}</h2>
        <p className={styles.provider}>{model.provider}</p>
        <div className={styles.metaRow}>
          <span
            className={styles.contextWindow}
            title={`Контекстное окно: ${model.contextLength.toLocaleString("ru-RU")} токенов`}
          >
            <IconLayers width={14} height={14} className={styles.metaIcon} aria-hidden />
            <span>{model.contextWindow}</span>
          </span>
          <span
            className={`${styles.pricing} ${model.pricing.isFree ? styles.pricingFree : ""}`}
            title={
              model.pricing.isFree
                ? "Бесплатная модель"
                : `Цена: Prompt $${model.pricing.promptPerMillion.toFixed(2)} / Completion $${model.pricing.completionPerMillion.toFixed(2)} за 1M токенов`
            }
          >
            {model.pricing.formattedSummary}
          </span>
          {hasReasoning || hasVision || hasTools || hasAudio ? (
            <div className={styles.capabilities} aria-label="Возможности">
              {hasReasoning ? (
                <span className={styles.capIcon} title="Рассуждения (Reasoning)" aria-label="Reasoning">
                  <IconBrain width={15} height={15} />
                </span>
              ) : null}
              {hasVision ? (
                <span className={styles.capIcon} title="Зрение (Vision)" aria-label="Vision">
                  <IconVision width={15} height={15} />
                </span>
              ) : null}
              {hasTools ? (
                <span className={styles.capIcon} title="Инструменты (Tools)" aria-label="Tools">
                  <IconTools width={15} height={15} />
                </span>
              ) : null}
              {hasAudio ? (
                <span className={styles.capIcon} title="Аудио (Audio)" aria-label="Audio">
                  <IconAudio width={15} height={15} />
                </span>
              ) : null}
            </div>
          ) : null}
          {model.releaseDate ? (
            <span
              className={styles.date}
              title={formatFullDate(model.releaseDate)}
            >
              {formatModelDate(model.releaseDate)}
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
          label={bookmarked ? "Убрать из закладок" : "Сохранить"}
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
