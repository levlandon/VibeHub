import { memo } from "react";
import { IconAudio, IconBrain, IconTools, IconVision } from "../../../components/icons";
import styles from "./ModelComponents.module.css";
import { useI18n } from "../../../i18n";

export interface ModelCapabilitiesProps {
  capabilities: string[];
}

export const ModelCapabilities = memo(function ModelCapabilities({
  capabilities,
}: ModelCapabilitiesProps) {
  const { t } = useI18n();
  const hasReasoning = capabilities.includes("Reasoning");
  const hasVision = capabilities.includes("Vision");
  const hasTools = capabilities.includes("Tools");
  const hasAudio = capabilities.includes("Audio");

  if (!hasReasoning && !hasVision && !hasTools && !hasAudio) {
    return null;
  }

  return (
    <div className={styles.capabilities} aria-label={t("models.capabilities")}>
      {hasReasoning ? (
        <span
          className={styles.capBadge}
          title={t("models.reasoningTitle")}
          aria-label={t("models.reasoningTitle")}
        >
          <IconBrain width={14} height={14} />
        </span>
      ) : null}
      {hasVision ? (
        <span
          className={styles.capBadge}
          title={t("models.visionTitle")}
          aria-label={t("models.visionTitle")}
        >
          <IconVision width={14} height={14} />
        </span>
      ) : null}
      {hasTools ? (
        <span
          className={styles.capBadge}
          title={t("models.toolsTitle")}
          aria-label={t("models.toolsTitle")}
        >
          <IconTools width={14} height={14} />
        </span>
      ) : null}
      {hasAudio ? (
        <span
          className={styles.capBadge}
          title={t("models.audioTitle")}
          aria-label={t("models.audioTitle")}
        >
          <IconAudio width={14} height={14} />
        </span>
      ) : null}
    </div>
  );
});
