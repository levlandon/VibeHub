import { useLocation, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { BookmarksPage, CollectionsPage } from "../Library/Library";
import styles from "./SavedPage.module.css";

const SAVED_TABS = [
  { id: "collections", label: "Коллекции" },
  { id: "bookmarks", label: "Закладки" },
] as const;

type SavedTabId = (typeof SAVED_TABS)[number]["id"];

export function SavedPage() {
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
      <PageHeader title="Сохранённое">
        <nav
          className={styles.primaryTabs}
          role="tablist"
          aria-label="Разделы сохранённого"
        >
          {SAVED_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.primaryTab} ${isActive ? styles.primaryTabActive : ""}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
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
