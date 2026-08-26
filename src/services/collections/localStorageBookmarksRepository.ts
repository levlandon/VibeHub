import type { SavedItem } from "../../types/saved";
import { savedId } from "../saved";
import { localStorageDriver, STORAGE_KEYS } from "../storage/localStorageDriver";
import type { StorageDriver } from "../storage/types";

export interface BookmarksRepository {
  getBookmarks(): Promise<SavedItem[]>;
  saveBookmark(item: Omit<SavedItem, "id" | "savedAt">): Promise<SavedItem>;
  removeBookmark(kind: string, targetId: string): Promise<boolean>;
  saveBookmarks(items: SavedItem[]): Promise<boolean>;
}

export class LocalStorageBookmarksRepository implements BookmarksRepository {
  private driver: StorageDriver;

  constructor(driver: StorageDriver = localStorageDriver) {
    this.driver = driver;
  }

  async getBookmarks(): Promise<SavedItem[]> {
    const data = this.driver.getItem<SavedItem[]>(STORAGE_KEYS.BOOKMARKS);
    if (!data || !Array.isArray(data)) return [];
    return data;
  }

  async saveBookmarks(items: SavedItem[]): Promise<boolean> {
    return this.driver.setItem(STORAGE_KEYS.BOOKMARKS, items);
  }

  async saveBookmark(item: Omit<SavedItem, "id" | "savedAt">): Promise<SavedItem> {
    const all = await this.getBookmarks();
    const existing = all.find((i) => i.kind === item.kind && i.targetId === item.targetId);
    if (existing) return existing;

    const saved: SavedItem = {
      ...item,
      id: savedId(item.kind, item.targetId),
      savedAt: new Date().toISOString(),
    };
    all.unshift(saved);
    await this.saveBookmarks(all);
    return saved;
  }

  async removeBookmark(kind: string, targetId: string): Promise<boolean> {
    const all = await this.getBookmarks();
    const filtered = all.filter((i) => !(i.kind === kind && i.targetId === targetId));
    if (filtered.length === all.length) return false;
    await this.saveBookmarks(filtered);
    return true;
  }
}

export const bookmarksRepository = new LocalStorageBookmarksRepository();
