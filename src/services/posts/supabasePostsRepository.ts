import type { SupabaseClient } from "@supabase/supabase-js";
import { INITIAL_POSTS } from "../../data/posts";
import type { EntityRef } from "../../types/entities";
import type { CreatePostInput, Post, PostComment } from "../../types/posts";
import { createPost as createInMemoryPost } from "../../features/posts/postsOperations";
import { mapComment, mapPost } from "./mapper";
import { buildPostgrestCursorFilter, paginateInMemory } from "./pagination";
import type {
  AcceptAnswerInput,
  DeleteCommentInput,
  PostsCursor,
  PostsPage,
  PostsRepository,
} from "./types";

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

  async createPost(
    input: CreatePostInput,
    entities: EntityRef[] = [],
  ): Promise<Post> {
    if (!this.client) {
      return createInMemoryPost(input, entities);
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error("Необходимо авторизоваться для создания публикации");
    }

    const payload = {
      author_id: userId,
      type: input.type,
      title: input.title.trim(),
      content: input.content.trim(),
      tags: input.tags ?? [],
      related_entities: entities ?? [],
      extras: input.extras ?? {},
      reactions: [],
    };

    const { data, error } = await this.client
      .from("posts")
      .insert(payload)
      .select(POSTS_LIST_SELECT)
      .single();

    if (error) throw error;
    const mapped = mapPost(data);
    if (!mapped) throw new Error("Не удалось создать публикацию");
    return mapped;
  }

  async updatePost(
    postId: string,
    input: Partial<CreatePostInput>,
    entities?: EntityRef[],
  ): Promise<Post> {
    if (!this.client) {
      const existing = this.fallbackPosts.find((p) => p.id === postId);
      if (!existing) throw new Error("Публикация не найдена");
      return {
        ...existing,
        title: input.title ?? existing.title,
        content: input.content ?? existing.content,
        tags: input.tags ?? existing.tags,
        extras: input.extras ?? existing.extras,
        relatedEntities: entities ?? existing.relatedEntities,
      };
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.content !== undefined) payload.content = input.content.trim();
    if (input.tags !== undefined) payload.tags = input.tags;
    if (input.extras !== undefined) payload.extras = input.extras;
    if (input.type !== undefined) payload.type = input.type;
    if (entities !== undefined) payload.related_entities = entities;

    const { data, error } = await this.client
      .from("posts")
      .update(payload)
      .eq("id", postId)
      .select(POSTS_LIST_SELECT)
      .single();

    if (error) throw error;
    const mapped = mapPost(data);
    if (!mapped) throw new Error("Не удалось обновить публикацию");
    return mapped;
  }

  async deletePost(postId: string): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) throw error;
  }

  async createComment(
    postId: string,
    content: string,
    parentCommentId?: string | null,
    replyToCommentId?: string | null,
  ): Promise<PostComment> {
    if (!this.client) {
      return {
        id: `comment-${Date.now()}`,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        author: { name: "User", handle: "user", initials: "U" },
        parentCommentId: parentCommentId ?? null,
        replyToCommentId: replyToCommentId ?? null,
      };
    }

    const {
      data: { session },
    } = await this.client.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error("Необходимо авторизоваться для добавления комментария");
    }

    const payload: {
      post_id: string;
      author_id: string;
      content: string;
      parent_comment_id?: string | null;
      reply_to_comment_id?: string | null;
    } = {
      post_id: postId,
      author_id: userId,
      content: content.trim(),
    };

    if (parentCommentId) {
      payload.parent_comment_id = parentCommentId;
    }
    if (replyToCommentId) {
      payload.reply_to_comment_id = replyToCommentId;
    }

    const { data, error } = await this.client
      .from("comments")
      .insert(payload)
      .select(COMMENTS_SELECT)
      .single();

    if (error) throw error;
    const mapped = mapComment(data);
    if (!mapped) throw new Error("Не удалось добавить комментарий");
    return mapped;
  }

  async updateComment(
    commentId: string,
    content: string,
  ): Promise<PostComment> {
    if (!this.client) {
      return {
        id: commentId,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        author: { name: "User", handle: "user", initials: "U" },
      };
    }

    const { data, error } = await this.client
      .from("comments")
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select(COMMENTS_SELECT)
      .single();

    if (error) throw error;
    const mapped = mapComment(data);
    if (!mapped) throw new Error("Не удалось обновить комментарий");
    return mapped;
  }

  async deleteComment({ postId, commentId }: DeleteCommentInput): Promise<PostComment> {
    if (!this.client) {
      const post = this.fallbackPosts.find((candidate) => candidate.id === postId);
      const comment = post?.comments?.find((candidate) => candidate.id === commentId);
      if (!comment) throw new Error("Комментарий не найден");
      return { ...comment, content: "", deletedAt: new Date().toISOString() };
    }

    const { data, error } = await this.client
      .from("comments")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("post_id", postId)
      .select(COMMENTS_SELECT)
      .single();

    if (error) throw error;
    const mapped = mapComment(data);
    if (!mapped) throw new Error("Не удалось удалить комментарий");
    return mapped;
  }

  async acceptAnswer({ postId, commentId }: AcceptAnswerInput): Promise<Post> {
    if (!this.client) {
      const post = this.fallbackPosts.find((candidate) => candidate.id === postId);
      if (!post) throw new Error("Публикация не найдена");
      return {
        ...post,
        solved: commentId !== null,
        acceptedAnswerId: commentId ?? undefined,
      };
    }

    const { data, error } = await this.client
      .from("posts")
      .update({ accepted_answer_id: commentId, solved: commentId !== null })
      .eq("id", postId)
      .eq("type", "question")
      .select(POSTS_DETAIL_SELECT)
      .single();

    if (error) throw error;
    const mapped = mapPost(data);
    if (!mapped) throw new Error("Не удалось обновить решение вопроса");
    return mapped;
  }
}
