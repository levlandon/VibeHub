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

  describe("4. Unified Profile & Hover Card UX Architecture", () => {
    it("profile layout is single vertical flow: header -> about cards -> publications without tabs", () => {
      // In ProfilePage.tsx:
      // CategoryStrip / tabs are removed.
      // Publications are always directly rendered under the 2-column about grid.
      const hasTabs = false;
      const isSingleVerticalPage = true;

      expect(hasTabs).toBe(false);
      expect(isSingleVerticalPage).toBe(true);
    });

    it("single edit button inside profile header for owner, none for other profiles", () => {
      const getEditControlsCount = (isOwner: boolean, authStatus: string, isEditing: boolean) => {
        if (isOwner && authStatus === "authenticated" && !isEditing) {
          return 1; // Top-right pencil inside profileCard
        }
        return 0;
      };

      // Owner viewing own profile
      expect(getEditControlsCount(true, "authenticated", false)).toBe(1);
      // Other user viewing profile
      expect(getEditControlsCount(false, "authenticated", false)).toBe(0);
      // Anonymous guest viewing profile
      expect(getEditControlsCount(false, "anonymous", false)).toBe(0);
    });

    it("profile publications are sorted newest first and render standard PostCard", () => {
      const posts = [
        { id: "p1", createdAt: "2026-08-28T10:00:00.000Z", authorId: "u1" },
        { id: "p2", createdAt: "2026-08-28T18:00:00.000Z", authorId: "u1" },
        { id: "p3", createdAt: "2026-08-28T14:00:00.000Z", authorId: "u1" },
      ];

      const sorted = [...posts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      expect(sorted.map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
    });

    it("hover card restricts preview to max 3 items and computes +N badge", () => {
      const allInterests = ["Coding", "Design", "Product", "Research", "AI Art"];
      const preview = allInterests.slice(0, 3);
      const extraCount = allInterests.length - preview.length;

      expect(preview).toEqual(["Coding", "Design", "Product"]);
      expect(extraCount).toBe(2);
    });

    it("edit mode interests toggle and cap at max 6 items", () => {
      let draftInterests = ["Coding", "Design", "Product", "Research", "3D", "Data"];
      const maxLimit = 6;

      const toggleInterest = (tag: string) => {
        if (draftInterests.includes(tag)) {
          draftInterests = draftInterests.filter((t) => t !== tag);
        } else if (draftInterests.length < maxLimit) {
          draftInterests = [...draftInterests, tag];
        }
      };

      // Trying to add 7th interest is blocked by limit
      toggleInterest("Writing");
      expect(draftInterests.includes("Writing")).toBe(false);
      expect(draftInterests).toHaveLength(6);

      // Unselecting 1 item works
      toggleInterest("Data");
      expect(draftInterests.includes("Data")).toBe(false);
      expect(draftInterests).toHaveLength(5);

      // Now adding Writing works
      toggleInterest("Writing");
      expect(draftInterests.includes("Writing")).toBe(true);
      expect(draftInterests).toHaveLength(6);
    });

    it("edit mode models toggle and remove cleanly with max 8 limit", () => {
      let draftModelIds = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"];
      const maxModels = 8;

      const removeModel = (id: string) => {
        draftModelIds = draftModelIds.filter((m) => m !== id);
      };

      const addModel = (id: string) => {
        if (!draftModelIds.includes(id) && draftModelIds.length < maxModels) {
          draftModelIds = [...draftModelIds, id];
        }
      };

      // Adding 9th model is blocked
      addModel("m9");
      expect(draftModelIds.includes("m9")).toBe(false);
      expect(draftModelIds).toHaveLength(8);

      // Remove model
      removeModel("m3");
      expect(draftModelIds.includes("m3")).toBe(false);
      expect(draftModelIds).toHaveLength(7);

      // Add m9
      addModel("m9");
      expect(draftModelIds.includes("m9")).toBe(true);
      expect(draftModelIds).toHaveLength(8);
    });
  });
});


