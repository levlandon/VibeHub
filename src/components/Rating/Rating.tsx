import styles from "./Rating.module.css";
import { useI18n } from "../../i18n";

interface RatingProps {
  value: number;
  votes?: number;
  interactive?: boolean;
  userValue?: number;
  onRate?: (stars: number) => void;
}

export function Rating({
  value,
  votes,
  interactive,
  userValue,
  onRate,
}: RatingProps) {
  const { t } = useI18n();
  return (
    <div className={styles.wrap}>
      {interactive ? (
        <div className={styles.stars} role="radiogroup" aria-label={t("rating.label")}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${styles.star} ${
                (userValue ?? 0) >= star ? styles.filled : ""
              }`}
              aria-label={`${star} из 5`}
              onClick={() => onRate?.(star)}
            >
              ★
            </button>
          ))}
        </div>
      ) : (
        <span className={styles.value}>
          ★ {typeof value === "number" && !isNaN(value) ? value.toFixed(1) : "0.0"}
        </span>
      )}
      {votes != null ? (
        <span className={styles.votes}>{t("rating.votes", { count: votes })}</span>
      ) : null}
    </div>
  );
}
