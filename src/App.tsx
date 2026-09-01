import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { ShareDialog } from "./features/share/ShareDialog";
import { ChatPanel } from "./components/ChatPanel/ChatPanel";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { AuthModal } from "./components/AuthModal/AuthModal";
import { SettingsModal } from "./components/SettingsModal/SettingsModal";
import { CHAT_BETA_ENABLED } from "./config/beta";
import { IconChat } from "./components/icons";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { useHub } from "./state/HubContext";
import { useI18n } from "./i18n";

export function Shell() {
  const { t } = useI18n();
  const {
    sidebarCollapsed,
    searchOpen,
    setSearchOpen,
    chatOpen,
    setChatOpen,
    authModalOpen,
    setAuthModalOpen,
    settingsOpen,
    setSettingsOpen,
    loginDev,
  } = useHub();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen]);

  // Clear a stale pre-beta chat flag left in localStorage by earlier builds.
  useEffect(() => {
    if (!CHAT_BETA_ENABLED && chatOpen) {
      setChatOpen(false);
    }
  }, [chatOpen, setChatOpen]);

  const shellClass = ["shell", sidebarCollapsed ? "is-collapsed" : ""].filter(Boolean).join(" ");

  return (
    <div className="app">
      {mobileOpen ? (
        <button
          className="backdrop"
          aria-label={t("common.closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      {CHAT_BETA_ENABLED && chatOpen ? (
        <button
          className="chat-backdrop"
          aria-label={t("common.collapseMenu")}
          onClick={() => setChatOpen(false)}
        />
      ) : null}
      <div className={CHAT_BETA_ENABLED && chatOpen ? "workspace with-chat" : "workspace"}>
        <div className={shellClass}>
          <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
          <div className="main-wrap">
            <button className="menu-btn" aria-label={t("common.openMenu")} onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <main className="main">
              <Outlet />
            </main>
            {CHAT_BETA_ENABLED && !chatOpen ? (
              <button
                type="button"
                className="chat-fab"
                title={t("common.openMenu")}
                aria-label={t("common.openMenu")}
                onClick={() => setChatOpen(true)}
              >
                <IconChat width={20} height={20} />
              </button>
            ) : null}
          </div>
        </div>
        {CHAT_BETA_ENABLED && chatOpen ? <ChatPanel /> : null}
      </div>
      <ShareDialog />
      <CommandPalette />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onDevLogin={loginDev}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

