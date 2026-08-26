import { getSupabaseClient } from "../supabase/client";
import { LocalStorageBookmarksRepository, type BookmarksRepository } from "./localStorageBookmarksRepository";
import { LocalStorageCollectionsRepository } from "./localStorageCollectionsRepository";
import { LocalStorageQuickAccessRepository } from "./localStorageQuickAccessRepository";
import { SupabaseBookmarksRepository } from "./supabaseBookmarksRepository";
import { SupabaseCollectionsRepository } from "./supabaseCollectionsRepository";
import type { CollectionsRepository, QuickAccessRepository } from "./types";

export * from "./types";
export * from "./localStorageCollectionsRepository";
export * from "./localStorageQuickAccessRepository";
export * from "./localStorageBookmarksRepository";
export * from "./supabaseBookmarksRepository";
export * from "./supabaseCollectionsRepository";

export const localStorageBookmarksRepository = new LocalStorageBookmarksRepository();
export const localStorageCollectionsRepository = new LocalStorageCollectionsRepository();
export const localStorageQuickAccessRepository = new LocalStorageQuickAccessRepository();

export const bookmarksRepository: BookmarksRepository = new SupabaseBookmarksRepository(
  getSupabaseClient(),
  localStorageBookmarksRepository,
);

export const collectionsRepository: CollectionsRepository = new SupabaseCollectionsRepository(
  getSupabaseClient(),
  localStorageCollectionsRepository,
);

export const quickAccessRepository: QuickAccessRepository = localStorageQuickAccessRepository;
