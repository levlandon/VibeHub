import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { ShareDialog } from "./features/share/ShareDialog";
import { ChatPanel } from "./components/ChatPanel/ChatPanel";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { IconChat } from "./components/icons";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { useHub } from "./state/HubContext";

export function Shell() {
  const { sidebarCollapsed, searchOpen, setSearchOpen, chatOpen, setChatOpen } = useHub();
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

  const shellClass = ["shell", sidebarCollapsed ? "is-collapsed" : ""].filter(Boolean).join(" ");

  return (
    <div className="app">
      {mobileOpen ? (
        <button
          className="backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      {chatOpen ? (
        <button
          className="chat-backdrop"
          aria-label="Свернуть чат"
          onClick={() => setChatOpen(false)}
        />
      ) : null}
      <div className={chatOpen ? "workspace with-chat" : "workspace"}>
        <div className={shellClass}>
          <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
          <div className="main-wrap">
            <button className="menu-btn" aria-label="Меню" onClick={() => setMobileOpen(true)}>
              ☰
            </button>
            <main className="main">
              <Outlet />
            </main>
            {chatOpen ? null : (
              <button
                type="button"
                className="chat-fab"
                title="Открыть чат"
                aria-label="Открыть чат"
                onClick={() => setChatOpen(true)}
              >
                <IconChat width={20} height={20} />
              </button>
            )}
          </div>
        </div>
        {chatOpen ? <ChatPanel /> : null}
      </div>
      <ShareDialog />
      <CommandPalette />
    </div>
  );
}

