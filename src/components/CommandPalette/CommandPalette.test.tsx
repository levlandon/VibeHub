import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../state/HubContext", () => ({
  useHub: () => ({
    searchOpen: true,
    setSearchOpen: vi.fn(),
    models: [],
    tools: [],
    openEntity: vi.fn(),
    setAddOpen: vi.fn(),
  }),
}));

vi.mock("../../features/posts", () => ({
  usePosts: () => ({ posts: [] }),
}));

import { CommandPalette } from "./CommandPalette";

describe("CommandPalette accessibility", () => {
  it("exposes an explicit accessible name for the search input", () => {
    const html = renderToStaticMarkup(<CommandPalette />);

    expect(html).toContain('aria-label="Поиск"');
    expect(html).not.toMatch(/<input[^>]*aria-label="Esc"/);
  });
});
