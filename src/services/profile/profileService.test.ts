import { describe, expect, it, beforeEach } from "vitest";
import { ProfileService } from "./profileService";
import type { ProfileRepository } from "./profileRepository";
import type { UserProfile } from "../../types/profile";

class MockProfileRepository implements ProfileRepository {
  private current: UserProfile = {
    avatar: "",
    displayName: "Test User",
    username: "testuser",
    bio: "Developer bio",
    codingAgents: ["Claude Code", "Cursor"],
    models: ["openai/gpt-4o"],
    tools: ["v0"],
    interests: ["Coding", "Research"],
  };

  getProfile(): UserProfile {
    return { ...this.current };
  }

  saveProfile(profile: UserProfile): boolean {
    this.current = { ...profile };
    return true;
  }

  resetProfile(): UserProfile {
    this.current = {
      avatar: "",
      displayName: "User",
      username: "user",
      bio: "",
      models: [],
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

  describe("getProfile", () => {
    it("возвращает текущий профиль из репозитория", () => {
      const profile = service.getProfile();
      expect(profile.displayName).toBe("Test User");
      expect(profile.username).toBe("testuser");
      expect(profile.codingAgents).toEqual(["Claude Code", "Cursor"]);
    });
  });

  describe("validateProfile", () => {
    it("валидный профиль проходит проверку", () => {
      const result = service.validateProfile({
        displayName: "Alex Rivers",
        username: "alex_rivers",
        bio: "Senior AI Engineer",
        avatar: "https://example.com/avatar.png",
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

    it("невалидный URL аватара вызывает ошибку", () => {
      const result = service.validateProfile({
        displayName: "Alex",
        username: "alex",
        avatar: "not-a-valid-url",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.avatar).toBeDefined();
    });
  });

  describe("saveProfile", () => {
    it("успешно сохраняет валидный профиль", () => {
      const update: UserProfile = {
        avatar: "https://example.com/avatar.jpg",
        displayName: "Updated Name",
        username: "updated_user",
        bio: "New Bio",
        models: ["anthropic/claude-3.5-sonnet"],
        interests: ["Coding", "Design"],
        codingAgents: ["Codex", "Aider"],
        tools: ["bolt-new"],
      };

      const result = service.saveProfile(update);
      expect(result.success).toBe(true);

      const saved = service.getProfile();
      expect(saved.displayName).toBe("Updated Name");
      expect(saved.interests).toEqual(["Coding", "Design"]);
    });

    it("не сохраняет невалидный профиль", () => {
      const invalid: UserProfile = {
        avatar: "",
        displayName: "",
        username: "user",
        bio: "",
        models: [],
        interests: [],
      };

      const result = service.saveProfile(invalid);
      expect(result.success).toBe(false);
      expect(result.errors?.displayName).toBeDefined();
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
