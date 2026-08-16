import type { SavedItem } from "../../types/saved";
import { localStorageDriver, STORAGE_KEYS } from "../storage/localStorageDriver";
import type { StorageDriver } from "../storage/types";

export interface BookmarksRepository {
  getBookmarks(): Promise<SavedItem[]>;
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
}

export const bookmarksRepository = new LocalStorageBookmarksRepository();
