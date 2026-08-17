import { memo, type MouseEvent } from "react";
import {
  REACTION_CONFIGS,
  type ModelReactions,
  type ReactionType,
} from "../../types/reactions";
import styles from "./ModelCommunityReactions.module.css";

export interface ModelCommunityReactionsProps {
  modelId: string;
  counts: ModelReactions;
  currentUserReactions: ReactionType[];
  onToggleReaction: (type: ReactionType) => void;
  className?: string;
}

export const ModelCommunityReactions = memo(function ModelCommunityReactions({
  counts,
  currentUserReactions,
  onToggleReaction,
  className = "",
}: ModelCommunityReactionsProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>, type: ReactionType) => {
    e.stopPropagation();
    onToggleReaction(type);
  };

  return (
    <div
      className={`${styles.container} ${className}`.trim()}
      role="group"
      aria-label="Реакции сообщества"
    >
      {REACTION_CONFIGS.map((cfg) => {
        const count = counts[cfg.type] ?? 0;
        const isSelected = currentUserReactions.includes(cfg.type);

        return (
          <button
            key={cfg.type}
            type="button"
            className={`${styles.pill} ${isSelected ? styles.pillActive : ""}`}
            onClick={(e) => handleClick(e, cfg.type)}
            title={cfg.tooltip}
            aria-label={`${cfg.tooltip} (${count})`}
            aria-pressed={isSelected}
          >
            <span className={styles.emoji} aria-hidden>
              {cfg.emoji}
            </span>
            <span className={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
});
