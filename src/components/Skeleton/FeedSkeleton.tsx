import { Skeleton } from "./Skeleton";
import feedStyles from "../../pages/Feed/FeedPage.module.css";
import cardStyles from "../../features/community/PostCard.module.css";

export function PostCardSkeleton() {
  return (
    <article className={cardStyles.card} style={{ cursor: "default", minHeight: "170px" }} aria-hidden="true">
      <header className={cardStyles.head}>
        <Skeleton variant="rounded" width={80} height={18} />
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "6px 0" }}>
        <Skeleton variant="rounded" width="75%" height={20} />
        <Skeleton variant="rounded" width="95%" height={14} />
        <Skeleton variant="rounded" width="60%" height={14} />
      </div>

      <footer className={cardStyles.footer} style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Skeleton variant="rounded" width={110} height={15} />
          <span style={{ color: "var(--text-dim)", opacity: 0.3 }}>·</span>
          <Skeleton variant="rounded" width={60} height={13} />
        </div>
        <Skeleton variant="rounded" width={24} height={24} />
      </footer>
    </article>
  );
}

export function FeedSkeletonList({
  count = 3,
  label = "Загрузка публикаций",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <ul className={feedStyles.feedGrid} aria-label={label} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className={feedStyles.gridItem}>
          <PostCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
