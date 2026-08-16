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
import { INITIAL_POSTS } from "../data/posts";
import { CURRENT_USER } from "../data/site";
import { TOOLS } from "../data/tools";
import { parseSpans } from "../services/content";
import { mentionIndex } from "../services/entities";
import { modelsService } from "../services/models";
import { bookmarksRepository } from "../services/collections";
import {
  acceptAnswer as acceptAnswerOn,
  addComment as addCommentOn,
  createPost,
} from "../services/posts";
import { fromBookmarks, isSaved, toggleSaved } from "../services/saved";
import { localStorageDriver, STORAGE_KEYS } from "../services/storage/localStorageDriver";
import type { CatalogKind, EntityKind, EntityRef } from "../types/entities";
import type { ChatChannelId, ChatMessage, Model, Route, Tool } from "../types/hub";
import type { CreatePostInput, Post } from "../types/posts";
import type { SavedItem } from "../types/saved";
import { entityFromPath, entityPath, routeFromPath, type EntityView } from "./routing";

const COLLAPSE_KEY = "vibehub-sidebar-collapsed";
const CHAT_KEY = "vibehub-chat-open";

interface HubState {
  route: Route;
  models: Model[];
  modelsLoading: boolean;
  modelsError: string | null;
  tools: Tool[];
  posts: Post[];
  savedItems: SavedItem[];
  mentionEntities: EntityRef[];
  addOpen: boolean;
  searchOpen: boolean;
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  chatChannel: ChatChannelId;
  messages: ChatMessage[];
  entityView: EntityView | null;
  setRoute: (route: Route) => void;
  setAddOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setChatChannel: (id: ChatChannelId) => void;
  setEntityView: (view: EntityView | null) => void;
  sendMessage: (text: string) => void;
  openEntity: (kind: EntityKind, id: string) => void;
  toggleModelBookmark: (id: string) => void;
  toggleToolBookmark: (id: string) => void;
  toggleSavedTarget: (item: Omit<SavedItem, "id" | "savedAt">) => void;
  publishPost: (input: CreatePostInput) => void;
  addComment: (postId: string, content: string) => void;
  acceptAnswer: (postId: string, commentId: string) => void;
  refreshModels: () => Promise<void>;
}

const HubContext = createContext<HubState | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const route = routeFromPath(pathname);
  const entityView = entityFromPath(pathname);
  const [addOpen, setAddOpen] = useState(false);
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
      const stored = localStorage.getItem(CHAT_KEY);
      if (stored === "0") return false;
      if (stored === "1") return true;
      return window.innerWidth >= 1280;
    } catch {
      return true;
    }
  });
  const [chatChannel, setChatChannel] = useState<ChatChannelId>("tools");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>(TOOLS);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const stored = localStorageDriver.getItem<SavedItem[]>(STORAGE_KEYS.BOOKMARKS);
    if (stored && Array.isArray(stored)) return stored;
    return fromBookmarks(TOOLS);
  });

  useEffect(() => {
    bookmarksRepository.saveBookmarks(savedItems);
  }, [savedItems]);

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

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          channelId: chatChannel,
          author: CURRENT_USER,
          text: trimmed,
          spans: parseSpans(trimmed, mentionEntities),
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [chatChannel, mentionEntities],
  );

  const openEntity = useCallback(
    (kind: EntityKind, id: string) => {
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
    (item: Omit<SavedItem, "id" | "savedAt">) => {
      const nextOn = !isSaved(savedItems, item.kind, item.targetId);
      setSavedItems((prev) => toggleSaved(prev, item));
      if (item.kind === "tool") {
        syncBookmark(item.kind, item.targetId, nextOn);
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

  const publishPost = useCallback(
    (input: CreatePostInput) => {
      setPosts((prev) => [createPost(input, mentionEntities), ...prev]);
    },
    [mentionEntities],
  );

  const addComment = useCallback((postId: string, content: string) => {
    setPosts((prev) => addCommentOn(prev, postId, content));
  }, []);

  const acceptAnswer = useCallback((postId: string, commentId: string) => {
    setPosts((prev) => acceptAnswerOn(prev, postId, commentId));
  }, []);

  const refreshModels = useCallback(async () => {
    await fetchModels(true);
  }, [fetchModels]);

  const value = useMemo(
    () => ({
      route,
      models,
      modelsLoading,
      modelsError,
      tools,
      posts,
      savedItems,
      mentionEntities,
      addOpen,
      searchOpen,
      sidebarCollapsed,
      chatOpen,
      chatChannel,
      messages,
      entityView,
      setRoute,
      setAddOpen,
      setSearchOpen,
      setSidebarCollapsed,
      setChatOpen,
      setChatChannel,
      setEntityView,
      sendMessage,
      openEntity,
      toggleModelBookmark,
      toggleToolBookmark,
      toggleSavedTarget,
      publishPost,
      addComment,
      acceptAnswer,
      refreshModels,
    }),
    [
      route,
      models,
      modelsLoading,
      modelsError,
      tools,
      posts,
      savedItems,
      mentionEntities,
      addOpen,
      searchOpen,
      sidebarCollapsed,
      chatOpen,
      chatChannel,
      messages,
      entityView,
      setRoute,
      setEntityView,
      setSidebarCollapsed,
      setChatOpen,
      sendMessage,
      openEntity,
      toggleModelBookmark,
      toggleToolBookmark,
      toggleSavedTarget,
      publishPost,
      addComment,
      acceptAnswer,
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

