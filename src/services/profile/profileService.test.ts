import { describe, expect, it, beforeEach } from "vitest";
import { ProfileService } from "./profileService";
import type { ProfileRepository } from "./profileRepository";
import type { UserProfile } from "../../types/profile";

class MockProfileRepository implements ProfileRepository {
  private current: UserProfile = {
    id: "user-1",
    avatarUrl: "",
    displayName: "Test User",
    username: "testuser",
    bio: "Developer bio",
    modelIds: ["openai/gpt-4o"],
    interests: ["Coding", "Research"],
  };

  async getProfile(): Promise<UserProfile> {
    return { ...this.current };
  }

  async saveProfile(profile: UserProfile): Promise<boolean> {
    this.current = { ...profile };
    return true;
  }

  async resetProfile(): Promise<UserProfile> {
    this.current = {
      id: "user-1",
      avatarUrl: "",
      displayName: "User",
      username: "user",
      bio: "",
      modelIds: [],
      interests: [],
    };
    return this.getProfile();
  }
}

describe("ProfileService", () => {
  let mockRepo: MockProfileRepository;
  let service: ProfileService;

  beforeEach(() => {
    mockRepo = new MockProfileRepository();
    service = new ProfileService(mockRepo);
  });

  describe("getCurrentProfile", () => {
    it("возвращает текущий профиль из репозитория", async () => {
      const profile = await service.getCurrentProfile();
      expect(profile?.displayName).toBe("Test User");
      expect(profile?.username).toBe("testuser");
      expect(profile?.modelIds).toEqual(["openai/gpt-4o"]);
    });
  });

  describe("validateProfile", () => {
    it("валидный профиль проходит проверку", () => {
      const result = service.validateProfile({
        displayName: "Alex Rivers",
        username: "alex_rivers",
        bio: "Senior AI Engineer",
        avatarUrl: "https://example.com/avatar.png",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("пустое имя вызывает ошибку валидации", () => {
      const result = service.validateProfile({
        displayName: "   ",
        username: "alex",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.displayName).toBeDefined();
    });

    it("слишком длинное имя вызывает ошибку", () => {
      const result = service.validateProfile({
        displayName: "A".repeat(51),
        username: "alex",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.displayName).toContain("50");
    });

    it("невалидный username вызывает ошибку", () => {
      const tooShort = service.validateProfile({ displayName: "Alex", username: "a" });
      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors.username).toBeDefined();

      const invalidChars = service.validateProfile({ displayName: "Alex", username: "alex@vibe!" });
      expect(invalidChars.valid).toBe(false);
      expect(invalidChars.errors.username).toBeDefined();
    });

    it("слишком длинное bio вызывает ошибку", () => {
      const result = service.validateProfile({
        displayName: "Alex",
        username: "alex",
        bio: "B".repeat(161),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.bio).toContain("160");
    });

    it("превышение лимита моделей (>8) вызывает ошибку", () => {
      const result = service.validateProfile({
        displayName: "Alex",
        username: "alex",
        modelIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.models).toContain("8");
    });

    it("превышение лимита интересов (>6) вызывает ошибку", () => {
      const result = service.validateProfile({
        displayName: "Alex",
        username: "alex",
        interests: ["1", "2", "3", "4", "5", "6", "7"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.interests).toContain("6");
    });
  });

  describe("updateCurrentProfile", () => {
    it("успешно обновляет валидный профиль", async () => {
      const updated = await service.updateCurrentProfile({
        displayName: "Updated Name",
        username: "updated_user",
        bio: "New Bio",
        modelIds: ["anthropic/claude-3.5-sonnet"],
        interests: ["Coding", "Design"],
      });

      expect(updated.displayName).toBe("Updated Name");
      expect(updated.username).toBe("updated_user");
      expect(updated.interests).toEqual(["Coding", "Design"]);

      const current = await service.getCurrentProfile();
      expect(current?.displayName).toBe("Updated Name");
    });

    it("выбрасывает ошибку при невалидном обновлении", async () => {
      await expect(
        service.updateCurrentProfile({
          displayName: "",
        }),
      ).rejects.toThrow();
    });
  });

  describe("getInitials", () => {
    it("генерирует 2 буквы из имени и фамилии", () => {
      expect(service.getInitials("Alex Rivers", "alex")).toBe("AR");
    });

    it("генерирует буквы из одного слова", () => {
      expect(service.getInitials("Vibe", "vibe")).toBe("VI");
    });

    it("использует username при пустом имени", () => {
      expect(service.getInitials("", "developer")).toBe("DE");
    });
  });
});

