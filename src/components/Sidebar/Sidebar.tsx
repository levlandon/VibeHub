import { useState } from "react";
import { useHub } from "../../state/HubContext";
import { profileService } from "../../services/profile";
import type { Route } from "../../types/hub";
import { UserMenu } from "../UserMenu/UserMenu";
import {
  IconBookmarks,
  IconChat,
  IconFeed,
  IconLogIn,
  IconModels,
  IconPanel,
  IconPlus,
  IconSearch,
} from "../icons";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const {
    route,
    authStatus,
    setAuthModalOpen,
    setRoute,
    setAddOpen,
    setSearchOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    chatOpen,
    setChatOpen,
    setSettingsOpen,
    logout,
    userProfile,
  } = useHub();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tip = (label: string) => (sidebarCollapsed ? label : undefined);
  const initials = profileService.getInitials(userProfile.displayName, userProfile.username);

  const navigateTo = (nextRoute: Route) => {
    setRoute(nextRoute);
    onNavigate();
  };

  return (
    <aside
      className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""} ${
        mobileOpen ? styles.mobileOpen : ""
      }`}
    >
      {/* Top Brand & Collapse button */}
      <div className={styles.brandRow}>
        <button
          type="button"
          className={styles.brand}
          title={tip("VibeHub")}
          onClick={() => navigateTo("models")}
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

      <div className={styles.navWrap}>
        {/* Группа 1: Исследовать */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Исследовать</div>
          <button
            type="button"
            className={styles.link}
            title={tip("Поиск")}
            onClick={() => setSearchOpen(true)}
          >
            <IconSearch width={20} height={20} />
            <span>Поиск</span>
          </button>
          <NavButton
            item={{ id: "models", label: "Модели", icon: IconModels }}
            active={route === "models"}
            tooltip={tip("Модели")}
            onClick={() => navigateTo("models")}
          />
        </div>

        {/* Группа 2: Сообщество */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Сообщество</div>
          <NavButton
            item={{ id: "feed", label: "Лента", icon: IconFeed }}
            active={route === "feed"}
            tooltip={tip("Лента")}
            onClick={() => navigateTo("feed")}
          />
          <button
            type="button"
            className={`${styles.link} ${chatOpen ? styles.active : ""}`}
            title={tip("Чат")}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <IconChat width={20} height={20} />
            <span>Чат</span>
          </button>
          <button
            type="button"
            className={styles.link}
            title={tip("Поделиться")}
            onClick={() => setAddOpen(true)}
          >
            <IconPlus width={20} height={20} />
            <span>Поделиться</span>
          </button>
        </div>

        {/* Группа 3: Моё */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Моё</div>
          <NavButton
            item={{ id: "saved", label: "Сохранённое", icon: IconBookmarks }}
            active={route === "saved" || route === "bookmarks" || route === "collections"}
            tooltip={tip("Сохранённое")}
            onClick={() => navigateTo("saved")}
          />
        </div>
      </div>

      {/* Нижний блок: Auth / Profile */}
      <div className={styles.bottom}>
        {authStatus === "anonymous" ? (
          sidebarCollapsed && !mobileOpen ? (
            <button
              type="button"
              className={styles.collapsedLoginBtn}
              title="Войти"
              aria-label="Войти"
              onClick={() => setAuthModalOpen(true)}
            >
              <IconLogIn width={20} height={20} />
            </button>
          ) : (
            <button
              type="button"
              className={styles.loginBtn}
              onClick={() => setAuthModalOpen(true)}
            >
              Войти
            </button>
          )
        ) : (
          <>
            <button
              type="button"
              className={`${styles.userBtn} ${userMenuOpen ? styles.userBtnActive : ""}`}
              title={tip(userProfile.displayName)}
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              <div className={styles.avatar}>
                {userProfile.avatarUrl || userProfile.avatar ? (
                  <img
                    src={userProfile.avatarUrl || userProfile.avatar}
                    alt={userProfile.displayName}
                    className={styles.avatarImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className={styles.userMeta}>
                <strong>{userProfile.displayName}</strong>
                <span>@{userProfile.username}</span>
              </div>
            </button>
            <UserMenu
              profile={userProfile}
              isOpen={userMenuOpen}
              onClose={() => setUserMenuOpen(false)}
              onOpenProfile={() => navigateTo("profile")}
              onOpenSettings={() => setSettingsOpen(true)}
              onLogout={() => logout()}
            />
          </>
        )}
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
      <Icon width={20} height={20} />
      <span>{item.label}</span>
    </button>
  );
}
