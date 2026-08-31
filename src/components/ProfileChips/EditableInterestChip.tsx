import { getInterestIcon } from "../icons";
import styles from "./ProfileChips.module.css";

export interface EditableInterestChipProps {
  tag: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function EditableInterestChip({
  tag,
  selected,
  disabled = false,
  onToggle,
}: EditableInterestChipProps) {
  const iconProps = {
    width: 14,
    height: 14,
    className: styles.icon,
  };

  return (
    <button
      type="button"
      className={`${styles.editableInterestChip} ${selected ? styles.editableInterestChipSelected : ""}`}
      onClick={onToggle}
      disabled={disabled}
      title={tag}
      aria-pressed={selected}
    >
      {selected ? <span className={styles.checkMark}>✓</span> : null}
      {getInterestIcon(tag)(iconProps)}
      <span>{tag}</span>
    </button>
  );
}
