import type { StorageDriver } from "./types";

export const STORAGE_KEYS = {
  VERSION: "vibehub.storage.version",
  COLLECTIONS: "vibehub.collections",
  QUICK_ACCESS: "vibehub.quickAccess",
  BOOKMARKS: "vibehub.bookmarks",
  USER_PROFILE: "vibehub.user.profile",
  AUTH_USER: "vibehub.auth.user",
  MODEL_REACTIONS: "vibehub.model.reactions",
  LANGUAGE: "vibehub.language",
} as const;

export const CURRENT_STORAGE_VERSION = "1";

export class LocalStorageDriver implements StorageDriver {
  private isAvailable(): boolean {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return false;
      }
      const testKey = "__vibehub_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getItem<T>(key: string): T | null {
    if (!this.isAvailable()) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[LocalStorageDriver] Failed to parse item for key "${key}":`, err);
      return null;
    }
  }

  setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[LocalStorageDriver] Failed to set item for key "${key}":`, err);
      return false;
    }
  }

  removeItem(key: string): boolean {
    if (!this.isAvailable()) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[LocalStorageDriver] Failed to remove item for key "${key}":`, err);
      return false;
    }
  }
}

export const localStorageDriver = new LocalStorageDriver();
