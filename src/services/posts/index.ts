import { getSupabaseClient } from "../supabase/client";
import { SupabasePostsRepository } from "./supabasePostsRepository";
import type { PostsRepository } from "./types";

export * from "./types";
export * from "./pagination";
export * from "./mapper";
export * from "./supabasePostsRepository";

/**
 * Checks if Supabase client credentials are configured.
 */
export function isPostsSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Creates a new PostsRepository instance with the current Supabase client.
 */
export function createPostsRepository(): PostsRepository {
  return new SupabasePostsRepository(getSupabaseClient());
}

/**
 * Singleton repository instance for the application layer.
 */
export const postsRepository: PostsRepository = createPostsRepository();
