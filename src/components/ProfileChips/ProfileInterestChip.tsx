import { getInterestIcon } from "../icons";
import styles from "./ProfileChips.module.css";

export interface ProfileInterestChipProps {
  tag: string;
  size?: "normal" | "compact";
}

export function ProfileInterestChip({
  tag,
  size = "normal",
}: ProfileInterestChipProps) {
  const isCompact = size === "compact";
  const iconProps = {
    width: isCompact ? 12 : 14,
    height: isCompact ? 12 : 14,
    className: styles.icon,
  };

  return (
    <div
      className={`${styles.chip} ${isCompact ? styles.chipCompact : ""}`}
      title={tag}
    >
      {getInterestIcon(tag)(iconProps)}
      <span className={styles.label}>{tag}</span>
    </div>
  );
}
