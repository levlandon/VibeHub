import { POST_TYPES } from "../../config/postTypes";
import type { PostType } from "../../types/posts";
import styles from "./PostTypeSelector.module.css";
import { useI18n } from "../../i18n";

export function PostTypeSelector({ onPick }: { onPick: (type: PostType) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <p className={styles.lead}>{t("composer.chooseType")}</p>
      <ul className={styles.list}>
        {POST_TYPES.map((item) => (
          <li key={item.id}>
            <button type="button" className={styles.row} onClick={() => onPick(item.id)}>
              <span className={styles.mark} aria-hidden>
                {item.mark}
              </span>
              <span>
                <strong>{t(`composer.${item.id}`)}</strong>
                <em>{t(`composer.types.${item.id}.hint`)}</em>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
