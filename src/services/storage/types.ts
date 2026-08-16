export interface StorageDriver {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): boolean;
  removeItem(key: string): boolean;
}
