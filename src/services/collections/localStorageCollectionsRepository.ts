import { faviconFor, parseSiteUrl } from "../../lib/siteUrl";
import type {
  Collection,
  CollectionItem,
  CreateCollectionInput,
  CreateCollectionItemInput,
  UpdateCollectionInput,
} from "../../types/collections";
import {
  CURRENT_STORAGE_VERSION,
  localStorageDriver,
  STORAGE_KEYS,
} from "../storage/localStorageDriver";
import type { StorageDriver } from "../storage/types";
import type { CollectionsRepository } from "./types";

const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: "col-assistants",
    name: "AI Assistants",
    description: "Веб-интерфейсы и чат-ассистенты для ежедневной работы",
    createdAt: "2026-01-10T12:00:00.000Z",
    updatedAt: "2026-01-10T12:00:00.000Z",
    items: [
      {
        id: "item-openrouter",
        url: "https://openrouter.ai",
        title: "OpenRouter",
        domain: "openrouter.ai",
        description: "Единый API и чат для доступа ко всем LLM",
        favicon: faviconFor("openrouter.ai"),
        createdAt: "2026-01-10T12:00:00.000Z",
      },
      {
        id: "item-claude",
        url: "https://claude.ai",
        title: "Claude AI",
        domain: "claude.ai",
        description: "Ассистент от Anthropic с артефактами и проектами",
        favicon: faviconFor("claude.ai"),
        createdAt: "2026-01-10T12:05:00.000Z",
      },
      {
        id: "item-chatgpt",
        url: "https://chatgpt.com",
        title: "ChatGPT",
        domain: "chatgpt.com",
        description: "Модели OpenAI GPT-4o и o3",
        favicon: faviconFor("chatgpt.com"),
        createdAt: "2026-01-10T12:10:00.000Z",
      },
    ],
  },
  {
    id: "col-coding",
    name: "Coding & Dev",
    description: "Инструменты для vibe coding, генерации кода и агентов",
    createdAt: "2026-01-11T12:00:00.000Z",
    updatedAt: "2026-01-11T12:00:00.000Z",
    items: [
      {
        id: "item-v0",
        url: "https://v0.dev",
        title: "v0 by Vercel",
        domain: "v0.dev",
        description: "Генеративный UI и фронтенд-компоненты",
        favicon: faviconFor("v0.dev"),
        createdAt: "2026-01-11T12:00:00.000Z",
      },
      {
        id: "item-cursor",
        url: "https://cursor.com",
        title: "Cursor",
        domain: "cursor.com",
        description: "AI-first редактор кода",
        favicon: faviconFor("cursor.com"),
        createdAt: "2026-01-11T12:05:00.000Z",
      },
      {
        id: "item-bolt",
        url: "https://bolt.new",
        title: "Bolt.new",
        domain: "bolt.new",
        description: "In-browser web development агент",
        favicon: faviconFor("bolt.new"),
        createdAt: "2026-01-11T12:10:00.000Z",
      },
    ],
  },
  {
    id: "col-research",
    name: "Research & Benchmarks",
    description: "Датасеты, открытые веса, бенчмарки и анализ",
    createdAt: "2026-01-12T12:00:00.000Z",
    updatedAt: "2026-01-12T12:00:00.000Z",
    items: [
      {
        id: "item-hf",
        url: "https://huggingface.co",
        title: "Hugging Face",
        domain: "huggingface.co",
        description: "Хаб моделей, датасетов и спейсов",
        favicon: faviconFor("huggingface.co"),
        createdAt: "2026-01-12T12:00:00.000Z",
      },
      {
        id: "item-aa",
        url: "https://artificialanalysis.ai",
        title: "Artificial Analysis",
        domain: "artificialanalysis.ai",
        description: "Независимые бенчмарки скорости, цены и качества моделей",
        favicon: faviconFor("artificialanalysis.ai"),
        createdAt: "2026-01-12T12:05:00.000Z",
      },
    ],
  },
];

export class LocalStorageCollectionsRepository implements CollectionsRepository {
  private driver: StorageDriver;

  constructor(driver: StorageDriver = localStorageDriver) {
    this.driver = driver;
    this.initStorage();
  }

  private initStorage(): void {
    const version = this.driver.getItem<string>(STORAGE_KEYS.VERSION);
    if (!version) {
      this.driver.setItem(STORAGE_KEYS.VERSION, CURRENT_STORAGE_VERSION);
    }

    const existing = this.driver.getItem<Collection[]>(STORAGE_KEYS.COLLECTIONS);
    if (!existing || !Array.isArray(existing)) {
      this.driver.setItem(STORAGE_KEYS.COLLECTIONS, DEFAULT_COLLECTIONS);
    }
  }

  private loadAll(): Collection[] {
    const data = this.driver.getItem<Collection[]>(STORAGE_KEYS.COLLECTIONS);
    if (!data || !Array.isArray(data)) {
      return [...DEFAULT_COLLECTIONS];
    }
    return data;
  }

  private saveAll(collections: Collection[]): boolean {
    return this.driver.setItem(STORAGE_KEYS.COLLECTIONS, collections);
  }

  async getCollections(): Promise<Collection[]> {
    return this.loadAll();
  }

  async getCollection(id: string): Promise<Collection | null> {
    const all = this.loadAll();
    return all.find((c) => c.id === id) ?? null;
  }

  async createCollection(input: CreateCollectionInput): Promise<Collection> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Название коллекции не может быть пустым");
    }

    const all = this.loadAll();
    const now = new Date().toISOString();
    const newCollection: Collection = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      description: input.description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      items: [],
    };

    all.unshift(newCollection);
    this.saveAll(all);
    return newCollection;
  }

  async updateCollection(id: string, input: UpdateCollectionInput): Promise<Collection> {
    const all = this.loadAll();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Коллекция с id "${id}" не найдена`);
    }

    const current = all[index];
    const updated: Collection = {
      ...current,
      name: input.name !== undefined ? input.name.trim() : current.name,
      description:
        input.description !== undefined
          ? input.description.trim() || undefined
          : current.description,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveAll(all);
    return updated;
  }

  async deleteCollection(id: string): Promise<boolean> {
    const all = this.loadAll();
    const filtered = all.filter((c) => c.id !== id);
    if (filtered.length === all.length) {
      return false;
    }
    this.saveAll(filtered);
    return true;
  }

  async addItem(
    collectionId: string,
    input: CreateCollectionItemInput,
  ): Promise<CollectionItem> {
    const all = this.loadAll();
    const collection = all.find((c) => c.id === collectionId);
    if (!collection) {
      throw new Error(`Коллекция с id "${collectionId}" не найдена`);
    }

    const parsed = parseSiteUrl(input.url);
    const domain = input.domain || parsed?.domain || "";
    const url = parsed?.url || input.url.trim();
    const title = input.title?.trim() || parsed?.title || domain || url;
    const favicon = input.favicon || (domain ? faviconFor(domain) : undefined);

    const newItem: CollectionItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      title,
      domain,
      description: input.description?.trim() || undefined,
      favicon,
      createdAt: new Date().toISOString(),
    };

    collection.items.unshift(newItem);
    collection.updatedAt = new Date().toISOString();

    this.saveAll(all);
    return newItem;
  }

  async updateItem(
    collectionId: string,
    itemId: string,
    changes: Partial<CollectionItem>,
  ): Promise<CollectionItem> {
    const all = this.loadAll();
    const collection = all.find((c) => c.id === collectionId);
    if (!collection) {
      throw new Error(`Коллекция с id "${collectionId}" не найдена`);
    }

    const itemIndex = collection.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Элемент с id "${itemId}" не найден в коллекции`);
    }

    const currentItem = collection.items[itemIndex];
    const updatedItem: CollectionItem = {
      ...currentItem,
      ...changes,
    };

    collection.items[itemIndex] = updatedItem;
    collection.updatedAt = new Date().toISOString();

    this.saveAll(all);
    return updatedItem;
  }

  async removeItem(collectionId: string, itemId: string): Promise<boolean> {
    const all = this.loadAll();
    const collection = all.find((c) => c.id === collectionId);
    if (!collection) return false;

    const initialCount = collection.items.length;
    collection.items = collection.items.filter((item) => item.id !== itemId);
    if (collection.items.length === initialCount) return false;

    collection.updatedAt = new Date().toISOString();
    this.saveAll(all);
    return true;
  }

  async moveItem(
    fromCollectionId: string,
    toCollectionId: string,
    itemId: string,
  ): Promise<boolean> {
    if (fromCollectionId === toCollectionId) return true;

    const all = this.loadAll();
    const fromCol = all.find((c) => c.id === fromCollectionId);
    const toCol = all.find((c) => c.id === toCollectionId);

    if (!fromCol || !toCol) return false;

    const itemIndex = fromCol.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return false;

    const [item] = fromCol.items.splice(itemIndex, 1);
    toCol.items.unshift(item);

    fromCol.updatedAt = new Date().toISOString();
    toCol.updatedAt = new Date().toISOString();

    this.saveAll(all);
    return true;
  }
}
