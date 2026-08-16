import { memo } from "react";
import { IconAudio, IconBrain, IconTools, IconVision } from "../../../components/icons";
import styles from "./ModelComponents.module.css";

export interface ModelCapabilitiesProps {
  capabilities: string[];
}

export const ModelCapabilities = memo(function ModelCapabilities({
  capabilities,
}: ModelCapabilitiesProps) {
  const hasReasoning = capabilities.includes("Reasoning");
  const hasVision = capabilities.includes("Vision");
  const hasTools = capabilities.includes("Tools");
  const hasAudio = capabilities.includes("Audio");

  if (!hasReasoning && !hasVision && !hasTools && !hasAudio) {
    return null;
  }

  return (
    <div className={styles.capabilities} aria-label="Возможности модели">
      {hasReasoning ? (
        <span
          className={styles.capBadge}
          title="Рассуждения (Reasoning)"
          aria-label="Рассуждения (Reasoning)"
        >
          <IconBrain width={14} height={14} />
        </span>
      ) : null}
      {hasVision ? (
        <span
          className={styles.capBadge}
          title="Компьютерное зрение (Vision)"
          aria-label="Компьютерное зрение (Vision)"
        >
          <IconVision width={14} height={14} />
        </span>
      ) : null}
      {hasTools ? (
        <span
          className={styles.capBadge}
          title="Вызов инструментов (Tools)"
          aria-label="Вызов инструментов (Tools)"
        >
          <IconTools width={14} height={14} />
        </span>
      ) : null}
      {hasAudio ? (
        <span
          className={styles.capBadge}
          title="Аудио (Audio)"
          aria-label="Аудио (Audio)"
        >
          <IconAudio width={14} height={14} />
        </span>
      ) : null}
    </div>
  );
});
