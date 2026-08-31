import { ProviderMark } from "../ProviderMark/ProviderMark";
import styles from "./ProfileChips.module.css";

export interface ProfileModelChipProps {
  name: string;
  provider?: string;
  model?: { providerId?: string; provider?: string; name: string };
  size?: "normal" | "compact";
  clickable?: boolean;
  onClick?: () => void;
}

export function ProfileModelChip({
  name,
  provider,
  model,
  size = "normal",
  clickable = false,
  onClick,
}: ProfileModelChipProps) {
  const isCompact = size === "compact";
  const markModel = model || (provider ? { providerId: provider, provider, name } : { name });

  if (clickable && onClick) {
    return (
      <button
        type="button"
        className={`${styles.chip} ${isCompact ? styles.chipCompact : ""} ${styles.chipClickable}`}
        onClick={onClick}
        title={`Перейти к модели ${name}`}
      >
        <ProviderMark
          model={markModel}
          size={isCompact ? 13 : 15}
          className={styles.modelMark}
        />
        <span className={styles.label}>{name}</span>
      </button>
    );
  }

  return (
    <div
      className={`${styles.chip} ${isCompact ? styles.chipCompact : ""}`}
      title={name}
    >
      <ProviderMark
        model={markModel}
        size={isCompact ? 13 : 15}
        className={styles.modelMark}
      />
      <span className={styles.label}>{name}</span>
    </div>
  );
}
