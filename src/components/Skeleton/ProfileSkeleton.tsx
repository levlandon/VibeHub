import { PageHeader } from "../PageHeader/PageHeader";
import { Skeleton } from "./Skeleton";
import styles from "../../pages/Profile/ProfilePage.module.css";

export function ProfileSkeleton({
  title = "Профиль",
  loadingLabel = "Загрузка профиля",
}: {
  title?: string;
  loadingLabel?: string;
} = {}) {
  return (
    <div className={styles.page} aria-busy="true" aria-label={loadingLabel}>
      <PageHeader title={title} />

      {/* Main Profile Card Skeleton */}
      <div className={styles.profileCard}>
        <div className={styles.heroRow}>
          <div className={styles.userInfo}>
            <Skeleton variant="circular" width={80} height={80} />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", justifyContent: "center" }}>
              <Skeleton variant="rounded" width={220} height={24} />
              <Skeleton variant="rounded" width={120} height={16} />
            </div>
          </div>
        </div>

        {/* Bio Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
          <Skeleton variant="rounded" width="85%" height={14} />
          <Skeleton variant="rounded" width="60%" height={14} />
        </div>
      </div>

      {/* 2-Column Sections Grid Skeleton */}
      <div className={styles.sectionsGrid}>
        {/* Used Models Card */}
        <div className={styles.sectionCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Skeleton variant="rounded" width={20} height={20} />
            <Skeleton variant="rounded" width={160} height={20} />
          </div>
          <div className={styles.chipGrid}>
            <Skeleton variant="rounded" width={160} height={36} />
            <Skeleton variant="rounded" width={140} height={36} />
            <Skeleton variant="rounded" width={170} height={36} />
            <Skeleton variant="rounded" width={130} height={36} />
          </div>
        </div>

        {/* Interests Card */}
        <div className={styles.sectionCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Skeleton variant="rounded" width={20} height={20} />
            <Skeleton variant="rounded" width={130} height={20} />
          </div>
          <div className={styles.tagsWrap}>
            <Skeleton variant="rounded" width={90} height={30} />
            <Skeleton variant="rounded" width={110} height={30} />
            <Skeleton variant="rounded" width={85} height={30} />
          </div>
        </div>
      </div>
    </div>
  );
}
