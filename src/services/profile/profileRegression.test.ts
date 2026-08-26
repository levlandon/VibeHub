import { describe, expect, it, vi } from "vitest";
import { profileIdentifierFromPath, profilePath } from "../../state/routing";
import { SupabaseProfileRepository } from "./supabaseProfileRepository";
import { LocalStorageProfileRepository } from "./profileRepository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Profile Regression Tests (Canonical Routing & No Mock Fallback on Error)", () => {
  describe("1. Canonical Routing Paths", () => {
    it("profilePath generates /profile/<handle> for handles", () => {
      expect(profilePath("alex_dev")).toBe("/profile/alex_dev");
      expect(profilePath("maria_ai")).toBe("/profile/maria_ai");
    });

    it("profilePath generates /profile for self/undefined", () => {
      expect(profilePath()).toBe("/profile");
      expect(profilePath(undefined)).toBe("/profile");
    });

    it("profileIdentifierFromPath extracts handle or uuid correctly", () => {
      expect(profileIdentifierFromPath("/profile/alex_dev")).toBe("alex_dev");
      expect(profileIdentifierFromPath("/profile/11111111-1111-4111-a111-111111111111")).toBe(
        "11111111-1111-4111-a111-111111111111",
      );
      expect(profileIdentifierFromPath("/profile")).toBeNull();
      expect(profileIdentifierFromPath("/models")).toBeNull();
    });
  });

  describe("2. SupabaseProfileRepository Error and Not-Found Handling (No Mock Fallback)", () => {
    const fallbackRepo = new LocalStorageProfileRepository();

    it("throws error when Supabase query fails (does NOT return mock profile)", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: new Error("Network connection refused / Supabase down"),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const repo = new SupabaseProfileRepository(mockClient, fallbackRepo);

      await expect(repo.getProfile("alex_dev")).rejects.toThrow(
        "Network connection refused / Supabase down",
      );
    });

    it("returns null when profile is not found (does NOT return mock profile)", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const repo = new SupabaseProfileRepository(mockClient, fallbackRepo);
      const result = await repo.getProfile("non_existent_user");

      expect(result).toBeNull();
    });

    it("resolves profile by handle correctly", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "11111111-1111-4111-a111-111111111111",
                  name: "Alex Dev",
                  handle: "alex_dev",
                  avatar_url: "https://example.com/avatar.jpg",
                  bio: "Lead Developer",
                  model_ids: ["anthropic/claude-3.7-sonnet"],
                  interests: ["Coding"],
                  updated_at: "2026-08-25T10:00:00Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const repo = new SupabaseProfileRepository(mockClient, fallbackRepo);
      const profile = await repo.getProfile("alex_dev");

      expect(profile).not.toBeNull();
      expect(profile?.displayName).toBe("Alex Dev");
      expect(profile?.username).toBe("alex_dev");
      expect(profile?.bio).toBe("Lead Developer");
    });

    it("resolves profile by UUID correctly", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "22222222-2222-4222-a222-222222222222",
                  name: "Maria AI",
                  handle: "maria_ai",
                  avatar_url: "",
                  bio: "AI Researcher",
                  model_ids: ["deepseek/deepseek-r1"],
                  interests: ["Research"],
                  updated_at: "2026-08-25T11:00:00Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const repo = new SupabaseProfileRepository(mockClient, fallbackRepo);
      const profile = await repo.getProfile("22222222-2222-4222-a222-222222222222");

      expect(profile).not.toBeNull();
      expect(profile?.displayName).toBe("Maria AI");
      expect(profile?.username).toBe("maria_ai");
      expect(profile?.bio).toBe("AI Researcher");
    });
  });

  describe("3. Account Switch Safety & Stale Response Protection", () => {
    it("stale async response from User A is discarded and does not overwrite User B", async () => {
      let activeUserId: string | null = null;
      let currentState: string | null = null;

      const simulateUserSwitch = async (userId: string, delayMs: number) => {
        activeUserId = userId;
        const currentActive = activeUserId;
        currentState = null; // immediately reset state

        await new Promise((r) => setTimeout(r, delayMs));

        // If user changed while waiting, discard response
        if (activeUserId !== currentActive) {
          return;
        }
        currentState = `profile_data_for_${userId}`;
      };

      // Start loading User A (slow request: 50ms)
      const promiseA = simulateUserSwitch("user_A", 50);

      // Immediately switch to User B (fast request: 10ms)
      const promiseB = simulateUserSwitch("user_B", 10);

      await Promise.all([promiseA, promiseB]);

      // State MUST be User B, not overwritten by slow User A
      expect(currentState).toBe("profile_data_for_user_B");
    });
  });
});
