import { memo } from "react";
import { IconArrowDown, IconArrowUp, IconLayers } from "../../../components/icons";
import type { Model } from "../../../types/models";
import { ModelCapabilities } from "./ModelCapabilities";
import { ModelModalities } from "./ModelModalities";
import styles from "./ModelComponents.module.css";
import { useI18n } from "../../../i18n";

export interface ModelMetaProps {
  model: Model;
}

function formatPriceNumber(val: number | null, unavailable: string): string {
  if (val === null) return unavailable;
  if (val === 0) return "0";
  if (val < 0.01) return val.toFixed(4).replace(/0+$/, "");
  if (val < 1) return val.toFixed(2);
  if (val % 1 === 0) return val.toString();
  return val.toFixed(2);
}

export const ModelMeta = memo(function ModelMeta({ model }: ModelMetaProps) {
  const { language, t } = useI18n();
  const isFree = model.pricing.isFree;
  const promptPrice = formatPriceNumber(model.pricing.promptPerMillion, t("model.notAvailable"));
  const completionPrice = formatPriceNumber(model.pricing.completionPerMillion, t("model.notAvailable"));

  const priceTooltip = isFree
    ? t("models.freeModel")
    : t("model.priceTooltip", { prompt: promptPrice, completion: completionPrice });

  return (
    <div className={styles.metaBar} aria-label={t("model.characteristics")}>
      {/* Context window */}
      <div
        className={styles.metaChip}
        title={t("models.contextWindow", { count: model.contextLength.toLocaleString(language === "ru" ? "ru-RU" : "en-US") })}
        aria-label={t("model.contextWindowAria", { window: model.contextWindow, count: model.contextLength.toLocaleString(language === "ru" ? "ru-RU" : "en-US") })}
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
          <span className={styles.freeText}>{t("model.free")}</span>
        ) : (
          <div className={styles.priceRow}>
            <span className={styles.priceItem} title={t("model.inputPrice", { price: promptPrice })}>
              <IconArrowDown width={12} height={12} className={styles.priceArrowDown} />
              <span>${promptPrice}</span>
            </span>
            <span className={styles.priceItem} title={t("model.outputPrice", { price: completionPrice })}>
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
