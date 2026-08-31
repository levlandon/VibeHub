import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { INITIAL_MESSAGES } from "../data/chat";
import { TOOLS } from "../data/tools";
import { parseSpans } from "../services/content";
import { mentionIndex } from "../services/entities";
import { modelsService } from "../services/models";
import { bookmarksRepository } from "../services/collections";
import { isSaved, toggleSaved } from "../services/saved";
import type { AuthStatus, CurrentUser } from "../types/auth";
import type { CatalogKind, EntityKind, EntityRef } from "../types/entities";
import type { ChatChannelId, ChatMessage, Model, Route, Tool } from "../types/hub";
import type { PostTopicCategory, PostType } from "../types/posts";
import type { SavedItem } from "../types/saved";
import type { UserProfile } from "../types/profile";
import { authService } from "../services/auth";
import { profileService } from "../services/profile";
import type { SettingsTab } from "../components/SettingsModal/SettingsModal";
import {
  entityFromPath,
  entityPath,
  profilePath,
  routeFromPath,
  type EntityView,
} from "./routing";

const COLLAPSE_KEY = "vibehub-sidebar-collapsed";
const CHAT_KEY = "vibehub-chat-open";

export interface OpenComposerOptions {
  entity?: EntityRef;
  type?: PostType;
  category?: PostTopicCategory;
  link?: string;
  initialText?: string;
}

interface HubState {
  route: Route;
  authStatus: AuthStatus;
  currentUser: CurrentUser | null;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  loginDev: (email?: string) => Promise<void>;
  logout: () => Promise<void>;
  models: Model[];
  modelsLoading: boolean;
  modelsError: string | null;
  tools: Tool[];
  savedItems: SavedItem[];
  mentionEntities: EntityRef[];
  addOpen: boolean;
  composerOptions: OpenComposerOptions | null;
  searchOpen: boolean;
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  chatChannel: ChatChannelId;
  messages: ChatMessage[];
  entityView: EntityView | null;
  userProfile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  retryLoadProfile: () => void;
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  setRoute: (route: Route) => void;
  setAddOpen: (open: boolean) => void;
  openComposer: (options?: OpenComposerOptions) => void;
  setSearchOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setChatChannel: (id: ChatChannelId) => void;
  setEntityView: (view: EntityView | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setSettingsTab: (tab: SettingsTab) => void;
  updateUserProfile: (profile: UserProfile | Partial<UserProfile>) => Promise<boolean>;
  sendMessage: (text: string) => void;
  openProfile: (identifier?: string) => void;
  openEntity: (kind: EntityKind, id: string) => void;
  toggleModelBookmark: (id: string) => void;
  toggleToolBookmark: (id: string) => void;
  toggleSavedTarget: (item: Omit<SavedItem, "id" | "savedAt">) => Promise<void>;
  refreshModels: () => Promise<void>;
}

const HubContext = createContext<HubState | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();

  const route = useMemo(() => routeFromPath(pathname), [pathname]);
  const entityView = useMemo(() => entityFromPath(pathname), [pathname]);

  const [addOpen, setAddOpenState] = useState(false);
  const [composerOptions, setComposerOptions] = useState<OpenComposerOptions | null>(null);

  const setAddOpen = useCallback((open: boolean) => {
    setAddOpenState(open);
    if (!open) {
      setComposerOptions(null);
    }
  }, []);

  const openComposer = useCallback((options?: OpenComposerOptions) => {
    setComposerOptions(options ?? null);
    setAddOpenState(true);
  }, []);

  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setCollapsedState] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [chatOpen, setChatOpenState] = useState(() => {
    try {
      return localStorage.getItem(CHAT_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [chatChannel, setChatChannel] = useState<ChatChannelId>("tools");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>(TOOLS);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  const fetchModels = useCallback(async (forceRefresh = false) => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const data = await modelsService.getModels({ forceRefresh });
      setModels(data);
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : "Не удалось загрузить каталог моделей");
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const mentionEntities = useMemo(() => mentionIndex(models, tools), [models, tools]);

  const setRoute = useCallback(
    (next: Route) => {
      navigate({ to: `/${next}` });
    },
    [navigate],
  );
  const setEntityView = useCallback(
    (view: EntityView | null) => {
      if (view) {
        navigate({ to: entityPath(view) });
      } else {
        navigate({ to: `/${routeFromPath(pathname)}` });
      }
    },
    [navigate, pathname],
  );

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setCollapsedState(collapsed);
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, []);

  const setChatOpen = useCallback((open: boolean) => {
    setChatOpenState(open);
    localStorage.setItem(CHAT_KEY, open ? "1" : "0");
  }, []);

  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => authService.getAuthState().status);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => authService.getAuthState().user);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((state) => {
      setAuthStatus(state.status);
      setCurrentUser(state.user);
    });
    return unsubscribe;
  }, []);

  const loginDev = useCallback(async (email?: string) => {
    try {
      const user = await authService.loginDevUser(email);
      setCurrentUser(user);
      setAuthStatus("authenticated");
    } catch (err) {
      console.warn("Dev login failed, falling back to local dev user:", err);
      const user = authService.loginDev();
      setCurrentUser(user);
      setAuthStatus("authenticated");
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setCurrentUser(null);
    setAuthStatus("anonymous");
  }, []);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");

  // OAuth URL cleanup: remove code/state/error fragments once loaded without full reload
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const url = new URL(window.location.href);
      const hasOAuthParams =
        url.searchParams.has("code") ||
        url.searchParams.has("error") ||
        url.searchParams.has("error_description") ||
        url.searchParams.has("error_code");

      if (hasOAuthParams) {
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("error");
        url.searchParams.delete("error_description");
        url.searchParams.delete("error_code");
        const cleanUrl =
          url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  const loadUserProfile = useCallback(async (userId?: string) => {
    if (!userId) {
      setUserProfileState(null);
      setProfileLoading(false);
      setProfileError(null);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    setUserProfileState(null);

    try {
      const profile = await profileService.getCurrentProfile(userId);
      if (profile) {
        setUserProfileState(profile);
      } else {
        setProfileError("Профиль пользователя не найден");
      }
    } catch (err) {
      console.error("[HubContext] Failed to load user profile:", err);
      setProfileError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить профиль пользователя. Проверьте соединение с сервером.",
      );
      setUserProfileState(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (authStatus === "authenticated" && currentUser?.id) {
      setProfileLoading(true);
      setProfileError(null);
      setUserProfileState(null);

      profileService
        .getCurrentProfile(currentUser.id)
        .then((profile) => {
          if (!active) return;
          if (profile) {
            setUserProfileState(profile);
            setProfileLoading(false);
          } else {
            setProfileError("Профиль пользователя не найден");
            setProfileLoading(false);
          }
        })
        .catch((err) => {
          if (!active) return;
          console.error("[HubContext] Failed to load user profile:", err);
          setProfileError(
            err instanceof Error
              ? err.message
              : "Не удалось загрузить профиль пользователя. Проверьте соединение с сервером.",
          );
          setUserProfileState(null);
          setProfileLoading(false);
        });
    } else if (authStatus === "anonymous") {
      setUserProfileState(null);
      setProfileLoading(false);
      setProfileError(null);
    } else if (authStatus === "loading") {
      setUserProfileState(null);
      setProfileLoading(true);
      setProfileError(null);
    }

    return () => {
      active = false;
    };
  }, [authStatus, currentUser?.id]);

  const retryLoadProfile = useCallback(() => {
    if (currentUser?.id) {
      loadUserProfile(currentUser.id);
    }
  }, [currentUser, loadUserProfile]);

  useEffect(() => {
    let active = true;
    setSavedItems([]);

    bookmarksRepository
      .getBookmarks()
      .then((items) => {
        if (!active) return;
        setSavedItems(items);
      })
      .catch((err) => {
        if (!active) return;
        console.error("[HubContext] Failed to load bookmarks:", err);
        setSavedItems([]);
      });

    return () => {
      active = false;
    };
  }, [authStatus, currentUser?.id]);

  const updateUserProfile = useCallback(
    async (updates: UserProfile | Partial<UserProfile>): Promise<boolean> => {
      try {
        const updated = await profileService.updateCurrentProfile(updates, currentUser?.id);
        setUserProfileState(updated);
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            displayName: updated.displayName,
            username: updated.username,
            avatarUrl: updated.avatarUrl,
          });
        }
        return true;
      } catch (err) {
        console.error("Failed to update profile:", err);
        return false;
      }
    },
    [currentUser],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          channelId: chatChannel,
          author: {
            name: userProfile?.displayName || "Пользователь",
            handle: userProfile?.username || "user",
            initials: profileService.getInitials(userProfile?.displayName, userProfile?.username),
          },
          text: trimmed,
          spans: parseSpans(trimmed, mentionEntities),
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [chatChannel, mentionEntities, userProfile],
  );

  const openProfile = useCallback(
    (identifier?: string) => {
      navigate({ to: profilePath(identifier) });
    },
    [navigate],
  );

  const openEntity = useCallback(
    (kind: EntityKind, id: string) => {
      if (kind === "user") {
        navigate({ to: profilePath(id) });
        return;
      }
      if (kind !== "model" && kind !== "tool") return;
      navigate({ to: entityPath({ kind, id }) });
    },
    [navigate],
  );

  const syncBookmark = useCallback((kind: CatalogKind, id: string, on: boolean) => {
    if (kind === "tool") {
      setTools((prev) => prev.map((item) => (item.id === id ? { ...item, bookmarked: on } : item)));
    }
  }, []);

  const toggleSavedTarget = useCallback(
    async (item: Omit<SavedItem, "id" | "savedAt">) => {
      const currentlySaved = isSaved(savedItems, item.kind, item.targetId);
      const nextOn = !currentlySaved;

      // Optimistic update
      setSavedItems((prev) => toggleSaved(prev, item));
      if (item.kind === "tool") {
        syncBookmark(item.kind, item.targetId, nextOn);
      }

      try {
        if (currentlySaved) {
          await bookmarksRepository.removeBookmark(item.kind, item.targetId);
        } else {
          await bookmarksRepository.saveBookmark(item);
        }
      } catch (err) {
        console.error("[HubContext] Failed to persist bookmark change:", err);
        // Rollback optimistic update
        setSavedItems((prev) => toggleSaved(prev, item));
        if (item.kind === "tool") {
          syncBookmark(item.kind, item.targetId, currentlySaved);
        }
      }
    },
    [savedItems, syncBookmark],
  );

  const toggleModelBookmark = useCallback(
    (id: string) => {
      const model = models.find((m) => m.id === id);
      if (!model) return;
      toggleSavedTarget({
        kind: "model",
        targetId: id,
        title: model.name,
        subtitle: model.provider,
      });
    },
    [models, toggleSavedTarget],
  );

  const toggleToolBookmark = useCallback(
    (id: string) => {
      const tool = tools.find((t) => t.id === id);
      if (!tool) return;
      toggleSavedTarget({
        kind: "tool",
        targetId: id,
        title: tool.name,
        subtitle: tool.typeLabel,
      });
    },
    [tools, toggleSavedTarget],
  );

  const refreshModels = useCallback(async () => {
    await fetchModels(true);
  }, [fetchModels]);

  const value = useMemo(
    () => ({
      route,
      authStatus,
      currentUser,
      authModalOpen,
      setAuthModalOpen,
      loginDev,
      logout,
      models,
      modelsLoading,
      modelsError,
      tools,
      savedItems,
      mentionEntities,
      addOpen,
      composerOptions,
      searchOpen,
      sidebarCollapsed,
      chatOpen,
      chatChannel,
      messages,
      entityView,
      userProfile,
      profileLoading,
      profileError,
      retryLoadProfile,
      settingsOpen,
      settingsTab,
      setRoute,
      setAddOpen,
      openComposer,
      setSearchOpen,
      setSidebarCollapsed,
      setChatOpen,
      setChatChannel,
      setEntityView,
      setSettingsOpen,
      setSettingsTab,
      updateUserProfile,
      sendMessage,
      openProfile,
      openEntity,
      toggleModelBookmark,
      toggleToolBookmark,
      toggleSavedTarget,
      refreshModels,
    }),
    [
      route,
      authStatus,
      currentUser,
      authModalOpen,
      loginDev,
      logout,
      models,
      modelsLoading,
      modelsError,
      tools,
      savedItems,
      mentionEntities,
      addOpen,
      composerOptions,
      searchOpen,
      sidebarCollapsed,
      chatOpen,
      chatChannel,
      messages,
      entityView,
      userProfile,
      profileLoading,
      profileError,
      retryLoadProfile,
      settingsOpen,
      settingsTab,
      setRoute,
      setAddOpen,
      openComposer,
      setEntityView,
      setSidebarCollapsed,
      setChatOpen,
      updateUserProfile,
      sendMessage,
      openProfile,
      openEntity,
      toggleModelBookmark,
      toggleToolBookmark,
      toggleSavedTarget,
      refreshModels,
    ],
  );

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used within HubProvider");
  return ctx;
}
