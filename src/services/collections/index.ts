import { LocalStorageCollectionsRepository } from "./localStorageCollectionsRepository";
import { LocalStorageQuickAccessRepository } from "./localStorageQuickAccessRepository";

export * from "./types";
export * from "./localStorageCollectionsRepository";
export * from "./localStorageQuickAccessRepository";
export * from "./localStorageBookmarksRepository";

export const collectionsRepository = new LocalStorageCollectionsRepository();
export const quickAccessRepository = new LocalStorageQuickAccessRepository();
