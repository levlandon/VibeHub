import type { SupabaseClient } from "@supabase/supabase-js";
import { INITIAL_POSTS } from "../../data/posts";
import type { Post, PostComment } from "../../types/posts";
import { mapComment, mapPost } from "./mapper";
import { buildPostgrestCursorFilter, paginateInMemory } from "./pagination";
import type { PostsCursor, PostsPage, PostsRepository } from "./types";

const POSTS_LIST_SELECT = "*, author:profiles!author_id(*)";

const POSTS_DETAIL_SELECT =
  "*, author:profiles!author_id(*), comments:comments!post_id(*, author:profiles!author_id(*))";

const COMMENTS_SELECT = "*, author:profiles!author_id(*)";

/** PostgREST code for "JSON object requested, multiple (or no) rows returned". */
const SINGLE_ROW_ERROR_CODE = "PGRST116";

export const DEFAULT_POSTS_LIMIT = 10;

export class SupabasePostsRepository implements PostsRepository {
  private client: SupabaseClient | null;
  private fallbackPosts: readonly Post[];

  constructor(
    client: SupabaseClient | null,
    fallbackPosts: readonly Post[] = INITIAL_POSTS,
  ) {
    this.client = client;
    this.fallbackPosts = fallbackPosts;
  }

  async getPosts(
    cursor?: PostsCursor,
    limit = DEFAULT_POSTS_LIMIT,
  ): Promise<PostsPage> {
    const safeLimit = Math.max(1, limit);

    if (!this.client) {
      const { items, nextCursor } = paginateInMemory(
        this.fallbackPosts,
        cursor,
        safeLimit,
      );
      return { posts: items, nextCursor };
    }

    let query = this.client
      .from("posts")
      .select(POSTS_LIST_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit + 1);

    if (cursor) {
      query = query.or(buildPostgrestCursorFilter(cursor));
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > safeLimit;
    const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;

    const posts = pageRows
      .map(mapPost)
      .filter((p): p is Post => p !== null);

    let nextCursor: PostsCursor | null = null;
    if (hasMore && posts.length > 0) {
      const last = posts[posts.length - 1];
      nextCursor = { createdAt: last.createdAt, id: last.id };
    }

    return { posts, nextCursor };
  }

  async getPost(id: string): Promise<Post | null> {
    if (!this.client) {
      return this.fallbackPosts.find((p) => p.id === id) ?? null;
    }

    const { data, error } = await this.client
      .from("posts")
      .select(POSTS_DETAIL_SELECT)
      .eq("id", id)
      .order("created_at", { referencedTable: "comments", ascending: true })
      .maybeSingle();

    if (error) {
      if (error.code === SINGLE_ROW_ERROR_CODE) return null;
      throw error;
    }
    if (!data) return null;
    return mapPost(data);
  }

  async getComments(postId: string): Promise<PostComment[]> {
    if (!this.client) {
      const post = this.fallbackPosts.find((p) => p.id === postId);
      return post?.comments ?? [];
    }

    const { data, error } = await this.client
      .from("comments")
      .select(COMMENTS_SELECT)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? [])
      .map(mapComment)
      .filter((c): c is PostComment => c !== null);
  }
}
