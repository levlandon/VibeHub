import styles from "./Models.module.css";

export function ModelSkeletonList({ count = 8 }: { count?: number }) {
  return (
    <ul className={styles.list} aria-label="Загрузка моделей..." aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className={styles.row}>
          <div className={styles.skeletonMark} />
          <div className={styles.body}>
            <div className={styles.skeletonTitle} style={{ width: `${140 + (i % 4) * 45}px` }} />
            <div className={styles.skeletonSub} style={{ width: `${80 + (i % 3) * 30}px` }} />
            <div className={styles.skeletonMeta}>
              <div className={styles.skeletonBadge} style={{ width: "45px" }} />
              <div className={styles.skeletonBadge} style={{ width: "65px" }} />
              <div className={styles.skeletonBadge} style={{ width: "90px" }} />
            </div>
          </div>
          <div className={styles.actions}>
            <div className={styles.skeletonAction} />
            <div className={styles.skeletonAction} />
            <div className={styles.skeletonAction} />
          </div>
        </li>
      ))}
    </ul>
  );
}
