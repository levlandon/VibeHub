import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthModal } from "./AuthModal";

describe("AuthModal localization controls", () => {
  it("renders the language globe with an explicit accessible name", () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen onClose={() => undefined} onDevLogin={() => undefined} />,
    );

    expect(html).toContain('aria-label="Выбрать язык"');
    expect(html).toContain("Войти в VibeHub");
    expect(html).not.toContain("Password should be at least 6 characters.");
  });
});
