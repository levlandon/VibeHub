import { CURRENT_USER, GITHUB_URL } from "../../data/site";
import { useHub } from "../../state/HubContext";
import type { Route } from "../../types/hub";
import {
  IconBenchmarks,
  IconBookmarks,
  IconCollections,
  IconGithub,
  IconModels,
  IconPanel,
  IconPlus,
  IconSearch,
  IconTools,
} from "../icons";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  mobileOpen: boolean;
  onNavigate: () => void;
}

const MAIN: { id: Route; label: string; icon: typeof IconModels }[] = [
  { id: "models", label: "Модели", icon: IconModels },
  { id: "tools", label: "Инструменты", icon: IconTools },
  { id: "benchmarks", label: "Бенчмарки", icon: IconBenchmarks },
];

const LIBRARY: { id: Route; label: string; icon: typeof IconBookmarks }[] = [
  { id: "bookmarks", label: "Закладки", icon: IconBookmarks },
  { id: "collections", label: "Коллекции", icon: IconCollections },
];

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const {
    route,
    setRoute,
    setAddOpen,
    setSearchOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useHub();

  const tip = (label: string) => (sidebarCollapsed ? label : undefined);

  return (
    <aside
      className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""} ${
        mobileOpen ? styles.mobileOpen : ""
      }`}
    >
      <div className={styles.brandRow}>
        <button
          type="button"
          className={styles.brand}
          title={tip("VibeHub")}
          onClick={() => setRoute("models")}
        >
          <span className={styles.wordmark}>
            <span className={styles.vibe}>Vibe</span>
            <span className={styles.hub}>Hub</span>
          </span>
        </button>
        <button
          type="button"
          className={styles.collapse}
          title={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-label={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <IconPanel width={18} height={18} />
        </button>
      </div>

      <nav className={styles.nav} aria-label="Поиск">
        <button
          type="button"
          className={styles.link}
          title={tip("Поиск")}
          onClick={() => setSearchOpen(true)}
        >
          <IconSearch width={22} height={22} />
          <span>Поиск</span>
        </button>
      </nav>

      <nav className={styles.nav} aria-label="Разделы">
        {MAIN.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={route === item.id}
            tooltip={tip(item.label)}
            onClick={() => {
              setRoute(item.id);
              onNavigate();
            }}
          />
        ))}
      </nav>

      <button
        type="button"
        className={`${styles.link} ${styles.share}`}
        title={tip("Поделиться")}
        onClick={() => setAddOpen(true)}
      >
        <IconPlus width={22} height={22} />
        <span>Поделиться</span>
      </button>

      <nav className={styles.library} aria-label="Библиотека">
        {LIBRARY.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={route === item.id}
            tooltip={tip(item.label)}
            onClick={() => {
              setRoute(item.id);
              onNavigate();
            }}
          />
        ))}
      </nav>

      <div className={styles.bottom}>
        <a
          className={styles.link}
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={tip("GitHub")}
        >
          <IconGithub width={22} height={22} />
          <span>GitHub</span>
        </a>
        <div className={styles.user} title={tip(CURRENT_USER.name)}>
          <span className={styles.avatar}>{CURRENT_USER.initials}</span>
          <div className={styles.userMeta}>
            <strong>{CURRENT_USER.name}</strong>
            <span>@{CURRENT_USER.handle}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavButton({
  item,
  active,
  tooltip,
  onClick,
}: {
  item: { id: string; label: string; icon: typeof IconModels };
  active: boolean;
  tooltip?: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`${styles.link} ${active ? styles.active : ""}`}
      aria-current={active ? "page" : undefined}
      title={tooltip}
      onClick={onClick}
    >
      <Icon width={22} height={22} />
      <span>{item.label}</span>
    </button>
  );
}
