import type { ReactNode } from "react";
import type { AiStackItem } from "../../types/profile";
import { IconCheck, IconBot, IconModels, IconTools } from "../icons";
import styles from "./AiStackCard.module.css";

interface AiStackCardProps {
  item: AiStackItem;
  selected: boolean;
  onToggle: (id: string) => void;
  variant?: "card" | "chip";
  icon?: ReactNode;
}

export function AiStackCard({
  item,
  selected,
  onToggle,
  variant = "card",
  icon,
}: AiStackCardProps) {
  const getFallbackIcon = () => {
    if (icon) return icon;
    if (item.category === "agents") {
      return <IconBot width={variant === "chip" ? 12 : 14} height={variant === "chip" ? 12 : 14} />;
    }
    if (item.category === "models") {
      return <IconModels width={variant === "chip" ? 12 : 14} height={variant === "chip" ? 12 : 14} />;
    }
    return <IconTools width={variant === "chip" ? 12 : 14} height={variant === "chip" ? 12 : 14} />;
  };

  return (
    <button
      type="button"
      className={`${styles.card} ${variant === "chip" ? styles.chip : ""} ${
        selected ? styles.selected : ""
      }`}
      onClick={() => onToggle(item.id)}
      aria-pressed={selected}
      title={item.description || item.name}
    >
      <span className={styles.iconWrap}>{getFallbackIcon()}</span>
      <div className={styles.content}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{item.name}</span>
          {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
        </div>
      </div>
      <span className={styles.checkMark} aria-hidden="true">
        <IconCheck width={14} height={14} />
      </span>
    </button>
  );
}
