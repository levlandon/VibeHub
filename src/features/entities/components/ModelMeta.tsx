import { memo } from "react";
import { IconArrowDown, IconArrowUp, IconLayers } from "../../../components/icons";
import type { Model } from "../../../types/models";
import { ModelCapabilities } from "./ModelCapabilities";
import { ModelModalities } from "./ModelModalities";
import styles from "./ModelComponents.module.css";

export interface ModelMetaProps {
  model: Model;
}

function formatPriceNumber(val: number | null): string {
  if (val === null) return "н/д";
  if (val === 0) return "0";
  if (val < 0.01) return val.toFixed(4).replace(/0+$/, "");
  if (val < 1) return val.toFixed(2);
  if (val % 1 === 0) return val.toString();
  return val.toFixed(2);
}

export const ModelMeta = memo(function ModelMeta({ model }: ModelMetaProps) {
  const isFree = model.pricing.isFree;
  const promptPrice = formatPriceNumber(model.pricing.promptPerMillion);
  const completionPrice = formatPriceNumber(model.pricing.completionPerMillion);

  const priceTooltip = isFree
    ? "Бесплатная модель (Free tier)"
    : `Цена: Вход (Prompt) $${promptPrice} / 1M · Выход (Completion) $${completionPrice} / 1M токенов`;

  return (
    <div className={styles.metaBar} aria-label="Характеристики модели">
      {/* Context window */}
      <div
        className={styles.metaChip}
        title={`Контекстное окно: ${model.contextLength.toLocaleString("ru-RU")} токенов`}
        aria-label={`Контекстное окно ${model.contextWindow} (${model.contextLength.toLocaleString("ru-RU")} токенов)`}
      >
        <IconLayers width={14} height={14} className={styles.metaIcon} aria-hidden />
        <span className={styles.metaChipText}>{model.contextWindow}</span>
      </div>

      {/* Pricing */}
      <div
        className={`${styles.metaChip} ${isFree ? styles.pricingFreeChip : ""}`}
        title={priceTooltip}
        aria-label={priceTooltip}
      >
        {isFree ? (
          <span className={styles.freeText}>Бесплатно</span>
        ) : (
          <div className={styles.priceRow}>
            <span className={styles.priceItem} title={`Вход: $${promptPrice} за 1M токенов`}>
              <IconArrowDown width={12} height={12} className={styles.priceArrowDown} />
              <span>${promptPrice}</span>
            </span>
            <span className={styles.priceItem} title={`Выход: $${completionPrice} за 1M токенов`}>
              <IconArrowUp width={12} height={12} className={styles.priceArrowUp} />
              <span>${completionPrice}</span>
            </span>
            <span className={styles.priceUnit}>/ 1M</span>
          </div>
        )}
      </div>

      {/* Capabilities */}
      <ModelCapabilities capabilities={model.capabilities} />

      {/* Modalities */}
      <ModelModalities architecture={model.architecture} />
    </div>
  );
});
