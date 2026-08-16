import { POST_TYPES } from "../../config/postTypes";
import type { PostType } from "../../types/posts";
import styles from "./PostTypeSelector.module.css";

export function PostTypeSelector({ onPick }: { onPick: (type: PostType) => void }) {
  return (
    <div>
      <p className={styles.lead}>Что хотите опубликовать?</p>
      <ul className={styles.list}>
        {POST_TYPES.map((item) => (
          <li key={item.id}>
            <button type="button" className={styles.row} onClick={() => onPick(item.id)}>
              <span className={styles.mark} aria-hidden>
                {item.mark}
              </span>
              <span>
                <strong>{item.label}</strong>
                <em>{item.hint}</em>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
