import { useLocation, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { BookmarksPage, CollectionsPage } from "../Library/Library";
import styles from "./SavedPage.module.css";
import { useI18n } from "../../i18n";

const SAVED_TABS = ["collections", "bookmarks"] as const;

type SavedTabId = (typeof SAVED_TABS)[number];

export function SavedPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useLocation({ select: (location) => location.search as { tab?: string } });
  const activeTab: SavedTabId = search?.tab === "bookmarks" ? "bookmarks" : "collections";

  const handleTabChange = (tabId: SavedTabId) => {
    navigate({
      to: "/saved",
      search: tabId === "bookmarks" ? { tab: "bookmarks" } : undefined,
    });
  };

  return (
    <div className={styles.page}>
      <PageHeader title={t("nav.saved")}>
        <nav
          className={styles.primaryTabs}
          role="tablist"
          aria-label={t("saved.sections")}
        >
          {SAVED_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.primaryTab} ${isActive ? styles.primaryTabActive : ""}`}
                onClick={() => handleTabChange(tab)}
              >
                {t(tab === "collections" ? "saved.collections" : "saved.bookmarks")}
              </button>
            );
          })}
        </nav>
      </PageHeader>

      {activeTab === "collections" ? (
        <CollectionsPage showHeader={false} />
      ) : (
        <BookmarksPage showHeader={false} />
      )}
    </div>
  );
}
