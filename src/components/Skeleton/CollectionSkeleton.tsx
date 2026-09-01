import { Skeleton } from "./Skeleton";
import styles from "../../pages/Library/Collections.module.css";

export function CollectionCardSkeleton() {
  return (
    <article className={styles.collectionCard} style={{ cursor: "default" }} aria-hidden="true">
      <div>
        <div className={styles.cardHead}>
          <Skeleton variant="rounded" width={140} height={20} />
          <Skeleton variant="rounded" width={24} height={24} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
          <Skeleton variant="rounded" width="90%" height={13} />
          <Skeleton variant="rounded" width="65%" height={13} />
        </div>
      </div>

      <div className={styles.cardFooter}>
        <Skeleton variant="rounded" width={50} height={14} />
        <div style={{ display: "flex", gap: "4px" }}>
          <Skeleton variant="circular" width={18} height={18} />
          <Skeleton variant="circular" width={18} height={18} />
          <Skeleton variant="circular" width={18} height={18} />
        </div>
      </div>
    </article>
  );
}

export function CollectionsGridSkeleton({
  count = 3,
  label = "Загрузка коллекций",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <ul className={styles.collectionsGrid} aria-label={label} aria-busy="true">
      {Array.from({ length: count }).map((_, idx) => (
        <li key={idx}>
          <CollectionCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function CollectionItemSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        marginBottom: "8px",
      }}
      aria-hidden="true"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "70%" }}>
        <Skeleton variant="rounded" width={28} height={28} />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
          <Skeleton variant="rounded" width="50%" height={16} />
          <Skeleton variant="rounded" width="80%" height={12} />
        </div>
      </div>
      <Skeleton variant="rounded" width={24} height={24} />
    </div>
  );
}

export function CollectionDetailSkeleton({
  count = 3,
  label = "Загрузка элементов коллекции",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} aria-label={label} aria-busy="true">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
        <Skeleton variant="rounded" width={200} height={24} />
        <Skeleton variant="rounded" width={300} height={14} />
      </div>
      <div>
        {Array.from({ length: count }).map((_, idx) => (
          <CollectionItemSkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}
