import { useState } from "react";
import { useHub } from "../../state/HubContext";
import { profileService } from "../../services/profile";
import { Skeleton } from "../Skeleton";
import type { Route } from "../../types/hub";
import { UserMenu } from "../UserMenu/UserMenu";
import { useI18n } from "../../i18n";
import {
  IconBenchmarks,
  IconBookmarks,
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
  const { t } = useI18n();
  const {
    route,
    authStatus,
    setAuthModalOpen,
    setRoute,
    setAddOpen,
    setSearchOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    setSettingsOpen,
    logout,
    userProfile,
  } = useHub();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tip = (label: string) => (sidebarCollapsed ? label : undefined);
  const initials = profileService.getInitials(userProfile?.displayName, userProfile?.username);

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
          title={sidebarCollapsed ? t("common.expandMenu") : t("common.collapseMenu")}
          aria-label={sidebarCollapsed ? t("common.expandMenu") : t("common.collapseMenu")}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <IconPanel width={18} height={18} />
        </button>
      </div>

      <div className={styles.navWrap}>
        {/* Группа 1: Исследовать */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>{t("nav.explore")}</div>
          <button
            type="button"
            className={styles.link}
            title={tip(t("common.search"))}
            onClick={() => setSearchOpen(true)}
          >
            <IconSearch width={20} height={20} />
            <span>{t("common.search")}</span>
          </button>
          <NavButton
            item={{ id: "models", label: t("nav.models"), icon: IconModels }}
            active={route === "models"}
            tooltip={tip(t("nav.models"))}
            onClick={() => navigateTo("models")}
          />
          <NavButton
            item={{ id: "benchmarks", label: t("nav.benchmarks"), icon: IconBenchmarks }}
            active={route === "benchmarks"}
            tooltip={tip(t("nav.benchmarks"))}
            onClick={() => navigateTo("benchmarks")}
          />
        </div>

        {/* Группа 2: Сообщество */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>{t("nav.community")}</div>
          <NavButton
            item={{ id: "feed", label: t("nav.feed"), icon: IconFeed }}
            active={route === "feed"}
            tooltip={tip(t("nav.feed"))}
            onClick={() => navigateTo("feed")}
          />
          <button
            type="button"
            className={styles.link}
            title={tip(t("nav.create"))}
            onClick={() => setAddOpen(true)}
          >
            <IconPlus width={20} height={20} />
            <span>{t("nav.create")}</span>
          </button>
        </div>

        {/* Группа 3: Моё */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>{t("nav.mine")}</div>
          <NavButton
            item={{ id: "saved", label: t("nav.saved"), icon: IconBookmarks }}
            active={route === "saved" || route === "bookmarks" || route === "collections"}
            tooltip={tip(t("nav.saved"))}
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
              title={t("auth.submit.login")}
              aria-label={t("auth.submit.login")}
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
              {t("auth.submit.login")}
            </button>
          )
        ) : !userProfile ? (
          <div className={styles.userBtn} style={{ cursor: "default" }} aria-hidden="true">
            <div className={styles.avatar} style={{ background: "transparent" }}>
              <Skeleton variant="circular" width={32} height={32} />
            </div>
            <div className={styles.userMeta} style={{ gap: "4px" }}>
              <Skeleton variant="rounded" width={80} height={14} />
              <Skeleton variant="rounded" width={50} height={11} />
            </div>
          </div>
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
