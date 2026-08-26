import { describe, expect, it } from "vitest";
import {
  getSafeRedirectUrl,
  mapSupabaseUser,
  DEV_SEED_USERS,
  DEV_MOCK_USER,
} from "./authService";
import type { User } from "@supabase/supabase-js";

describe("AuthService Unit & Regression Tests", () => {
  describe("1. getSafeRedirectUrl", () => {
    it("preserves pathname and harmless search params while stripping OAuth service params", () => {
      const url = "http://localhost:5173/models?sort=new&code=secret123&state=xyz456&error=none&error_description=test";
      const safe = getSafeRedirectUrl(url);

      expect(safe).toContain("/models");
      expect(safe).toContain("sort=new");
      expect(safe).not.toContain("code=");
      expect(safe).not.toContain("state=");
      expect(safe).not.toContain("error=");
      expect(safe).not.toContain("error_description=");
    });

    it("strips hash fragments containing access_token", () => {
      const url = "http://localhost:5173/feed#access_token=jwt123&token_type=bearer";
      const safe = getSafeRedirectUrl(url);

      expect(safe).toBe("http://localhost:5173/feed");
      expect(safe).not.toContain("access_token");
    });

    it("disallows external return URLs and stays on current origin", () => {
      const url = "https://malicious-site.com/steal-token";
      const safe = getSafeRedirectUrl(url);

      expect(safe).toBe(typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");
    });
  });

  describe("2. mapSupabaseUser with GitHub OAuth metadata", () => {
    it("extracts GitHub user_name, full_name, and avatar_url", () => {
      const mockUser = {
        id: "44444444-4444-4444-a444-444444444444",
        email: "octocat@github.com",
        user_metadata: {
          user_name: "octo-coder",
          full_name: "Octo Coder",
          avatar_url: "https://avatars.githubusercontent.com/u/999?v=4",
        },
      } as unknown as User;

      const mapped = mapSupabaseUser(mockUser);
      expect(mapped.id).toBe("44444444-4444-4444-a444-444444444444");
      expect(mapped.username).toBe("octo_coder"); // hyphens normalized
      expect(mapped.displayName).toBe("Octo Coder");
      expect(mapped.avatarUrl).toBe("https://avatars.githubusercontent.com/u/999?v=4");
    });

    it("falls back gracefully when user_name/full_name are missing", () => {
      const mockUser = {
        id: "55555555-5555-5555-a555-555555555555",
        email: "developer@example.com",
        user_metadata: {},
      } as unknown as User;

      const mapped = mapSupabaseUser(mockUser);
      expect(mapped.id).toBe("55555555-5555-5555-a555-555555555555");
      expect(mapped.username).toBe("developer");
      expect(mapped.displayName).toBe("developer");
      expect(mapped.avatarUrl).toBe("");
    });

    it("falls back to 'GitHub User' when email and metadata are absent", () => {
      const mockUser = {
        id: "66666666-6666-6666-a666-666666666666",
        user_metadata: {},
      } as unknown as User;

      const mapped = mapSupabaseUser(mockUser);
      expect(mapped.displayName).toBe("GitHub User");
      expect(mapped.username).toBe("user");
    });
  });

  describe("3. DEV Seed users and constants", () => {
    it("has exact required test users in DEV_SEED_USERS", () => {
      expect(DEV_SEED_USERS).toHaveLength(3);
      expect(DEV_SEED_USERS[0].email).toBe("alex@vibehub.dev");
      expect(DEV_SEED_USERS[1].email).toBe("maria@vibehub.dev");
      expect(DEV_SEED_USERS[2].email).toBe("dmitry@vibehub.dev");
    });

    it("DEV_MOCK_USER is well-formed", () => {
      expect(DEV_MOCK_USER.id).toBe("user-dev-1");
      expect(DEV_MOCK_USER.username).toBe("user");
    });
  });
});
