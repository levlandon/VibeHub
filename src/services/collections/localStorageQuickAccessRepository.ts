import { DEFAULT_QUICK_ACCESS } from "../../data/quickAccess";
import { faviconFor, parseSiteUrl } from "../../lib/siteUrl";
import type { QuickAccessSite } from "../../types/hub";
import { localStorageDriver, STORAGE_KEYS } from "../storage/localStorageDriver";
import type { StorageDriver } from "../storage/types";
import type { QuickAccessRepository } from "./types";

export const MAX_QUICK_ACCESS_ITEMS = 12;

export class LocalStorageQuickAccessRepository implements QuickAccessRepository {
  private driver: StorageDriver;

  constructor(driver: StorageDriver = localStorageDriver) {
    this.driver = driver;
    this.initStorage();
  }

  private initStorage(): void {
    const existing = this.driver.getItem<QuickAccessSite[]>(STORAGE_KEYS.QUICK_ACCESS);
    if (!existing || !Array.isArray(existing)) {
      this.driver.setItem(STORAGE_KEYS.QUICK_ACCESS, DEFAULT_QUICK_ACCESS);
    }
  }

  private loadAll(): QuickAccessSite[] {
    const data = this.driver.getItem<QuickAccessSite[]>(STORAGE_KEYS.QUICK_ACCESS);
    if (!data || !Array.isArray(data)) {
      return [...DEFAULT_QUICK_ACCESS];
    }
    return data;
  }

  private saveAll(sites: QuickAccessSite[]): boolean {
    return this.driver.setItem(STORAGE_KEYS.QUICK_ACCESS, sites);
  }

  async getSites(): Promise<QuickAccessSite[]> {
    return this.loadAll();
  }

  async addSite(site: Omit<QuickAccessSite, "id"> & { id?: string }): Promise<QuickAccessSite> {
    const all = this.loadAll();
    if (all.length >= MAX_QUICK_ACCESS_ITEMS) {
      throw new Error(`Достигнут лимит быстрого доступа (${MAX_QUICK_ACCESS_ITEMS} сайтов)`);
    }

    const parsed = parseSiteUrl(site.url);
    const domain = site.domain || parsed?.domain || "";
    const url = parsed?.url || site.url.trim();
    const title = site.title?.trim() || parsed?.title || domain;
    const favicon = site.favicon || (domain ? faviconFor(domain) : "");

    const newSite: QuickAccessSite = {
      id: site.id || `qa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      url,
      domain,
      favicon,
    };

    all.push(newSite);
    this.saveAll(all);
    return newSite;
  }

  async updateSite(id: string, update: Partial<QuickAccessSite>): Promise<QuickAccessSite> {
    const all = this.loadAll();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Сайт быстрого доступа с id "${id}" не найден`);
    }

    const current = all[index];
    const updated: QuickAccessSite = {
      ...current,
      ...update,
    };

    all[index] = updated;
    this.saveAll(all);
    return updated;
  }

  async removeSite(id: string): Promise<boolean> {
    const all = this.loadAll();
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return false;
    this.saveAll(filtered);
    return true;
  }

  async reorderSites(sites: QuickAccessSite[]): Promise<QuickAccessSite[]> {
    const trimmed = sites.slice(0, MAX_QUICK_ACCESS_ITEMS);
    this.saveAll(trimmed);
    return trimmed;
  }
}
