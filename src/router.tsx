import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { Shell } from "./App";
import { EntityPage } from "./features/entities/EntityPage";
import { BenchmarksPage } from "./pages/Benchmarks/Benchmarks";
import { BookmarksPage, CollectionsPage } from "./pages/Library/Library";
import { ModelsPage } from "./pages/Models/Models";
import { NotFound } from "./pages/NotFound/NotFound";
import { ToolsPage } from "./pages/Tools/Tools";
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

const modelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/models",
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  modelsRoute,
  modelDetailRoute,
  toolsRoute,
  toolDetailRoute,
  benchmarksRoute,
  bookmarksRoute,
  collectionsRoute,
]);

export const router = createRouter({ routeTree });
