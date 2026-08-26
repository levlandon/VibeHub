import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { Shell } from "./App";
import { EntityPage } from "./features/entities/EntityPage";
import { BenchmarksPage } from "./pages/Benchmarks/Benchmarks";
import { SavedPage } from "./pages/Saved";
import { ModelsPage } from "./pages/Models/Models";
import { NotFound } from "./pages/NotFound/NotFound";
import { ToolsPage } from "./pages/Tools/Tools";
import { ProfilePage } from "./pages/Profile/ProfilePage";
import { FeedPage } from "./pages/Feed/FeedPage";
import { HubProvider } from "./state/HubContext";
import { PostsProvider } from "./features/posts";

const rootRoute = createRootRoute({
  component: () => (
    <HubProvider>
      <PostsProvider>
        <Shell />
      </PostsProvider>
    </HubProvider>
  ),
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/models" });
  },
});

interface ModelsSearch {
  provider?: string;
}

const modelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/models",
  validateSearch: (search: Record<string, unknown>): ModelsSearch => {
    return {
      provider: typeof search.provider === "string" ? search.provider : undefined,
    };
  },
  component: ModelsPage,
});

const modelDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/models/$",
  component: EntityPage,
  params: {
    parse: (raw) => (raw._splat ? raw : false),
  },
});

const toolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools",
  component: ToolsPage,
});

const toolDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools/$",
  component: EntityPage,
  params: {
    parse: (raw) => (raw._splat ? raw : false),
  },
});

const benchmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/benchmarks",
  component: BenchmarksPage,
});

const benchmarkDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/benchmarks/$",
  component: BenchmarksPage,
  params: {
    parse: (raw) => (raw._splat ? raw : false),
  },
});

interface SavedSearch {
  tab?: "bookmarks" | "collections";
}

const savedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/saved",
  validateSearch: (search: Record<string, unknown>): SavedSearch => {
    return {
      tab:
        search.tab === "collections"
          ? "collections"
          : search.tab === "bookmarks"
            ? "bookmarks"
            : undefined,
    };
  },
  component: SavedPage,
});

const bookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bookmarks",
  beforeLoad: () => {
    throw redirect({ to: "/saved", search: { tab: "bookmarks" } });
  },
});

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections",
  beforeLoad: () => {
    throw redirect({ to: "/saved", search: { tab: "collections" } });
  },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const profileDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$",
  component: ProfilePage,
  params: {
    parse: (raw) => (raw._splat ? raw : false),
  },
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feed",
  component: FeedPage,
});

const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/people",
  beforeLoad: () => {
    throw redirect({ to: "/feed" });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  modelsRoute,
  modelDetailRoute,
  toolsRoute,
  toolDetailRoute,
  benchmarksRoute,
  benchmarkDetailRoute,
  savedRoute,
  bookmarksRoute,
  collectionsRoute,
  profileRoute,
  profileDetailRoute,
  feedRoute,
  peopleRoute,
]);

export const router = createRouter({ routeTree });
