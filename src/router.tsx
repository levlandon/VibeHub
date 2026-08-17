import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { Shell } from "./App";
import { EntityPage } from "./features/entities/EntityPage";
import { BenchmarksPage } from "./pages/Benchmarks/Benchmarks";
import { BookmarksPage, CollectionsPage } from "./pages/Library/Library";
import { ModelsPage } from "./pages/Models/Models";
import { NotFound } from "./pages/NotFound/NotFound";
import { ToolsPage } from "./pages/Tools/Tools";
import { ProfilePage } from "./pages/Profile/ProfilePage";
import { FeedPage } from "./pages/Feed/FeedPage";
import { HubProvider } from "./state/HubContext";

const rootRoute = createRootRoute({
  component: () => (
    <HubProvider>
      <Shell />
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

const bookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bookmarks",
  component: BookmarksPage,
});

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections",
  component: CollectionsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
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
  bookmarksRoute,
  collectionsRoute,
  profileRoute,
  feedRoute,
  peopleRoute,
]);

export const router = createRouter({ routeTree });
