import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PostComment } from "../../types/posts";
import { mapComment, mapPost } from "./mapper";
import type { PostsRepository } from "./types";

const POSTS_SELECT =
  "*, author:profiles!author_id(*), comments(*, author:profiles!author_id(*))";

const COMMENTS_SELECT = "*, author:profiles!author_id(*)";

/** PostgREST code for "JSON object requested, multiple (or no) rows returned". */
const SINGLE_ROW_ERROR_CODE = "PGRST116";

export class SupabasePostsRepository implements PostsRepository {
  private client: SupabaseClient | null;

  constructor(client: SupabaseClient | null) {
    this.client = client;
  }

  async getPosts(): Promise<Post[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from("posts")
      .select(POSTS_SELECT)
      .order("created_at", { ascending: false })
      .order("created_at", { ascending: true, referencedTable: "comments" });

    if (error) throw error;
    if (!data || !Array.isArray(data)) return [];

    return data
      .map(mapPost)
      .filter((post): post is Post => post !== null);
  }

  async getPost(id: string): Promise<Post | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from("posts")
      .select(POSTS_SELECT)
      .order("created_at", { ascending: true, referencedTable: "comments" })
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === SINGLE_ROW_ERROR_CODE) return null;
      throw error;
    }

    return mapPost(data);
  }

  async getComments(postId: string): Promise<PostComment[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from("comments")
      .select(COMMENTS_SELECT)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data || !Array.isArray(data)) return [];

    return data
      .map(mapComment)
      .filter((comment): comment is PostComment => comment !== null);
  }
}
