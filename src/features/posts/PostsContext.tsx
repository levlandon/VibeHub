import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  acceptAnswer as acceptAnswerOn,
  mergePostsDeduplicated,
} from "./postsOperations";
import {
  postsRepository as defaultPostsRepository,
  type PostsCursor,
  type PostsRepository,
} from "../../services/posts/index";
import type { EntityRef } from "../../types/entities";
import type { CreatePostInput, Post, PostComment } from "../../types/posts";

export interface PostsState {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  isMutating: boolean;
  error: string | null;
  mutationError: string | null;
  nextCursor: PostsCursor | null;
  hasMore: boolean;
  fetchPosts: () => Promise<void>;
  fetchMorePosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  publishPost: (input: CreatePostInput, entities?: EntityRef[]) => Promise<Post>;
  updatePost: (
    postId: string,
    input: Partial<CreatePostInput>,
    entities?: EntityRef[],
  ) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<PostComment>;
  updateComment: (
    commentId: string,
    content: string,
    postId?: string,
  ) => Promise<PostComment>;
  deleteComment: (commentId: string, postId?: string) => Promise<void>;
  acceptAnswer: (postId: string, commentId: string) => void;
  getPost: (id: string) => Promise<Post | null>;
  getComments: (postId: string) => Promise<PostComment[]>;
}

const PostsContext = createContext<PostsState | null>(null);

export interface PostsProviderProps {
  children: ReactNode;
  repository?: PostsRepository;
  pageSize?: number;
  mentionEntities?: EntityRef[];
  autoFetch?: boolean;
}

export function PostsProvider({
  children,
  repository = defaultPostsRepository,
  pageSize = 10,
  mentionEntities = [],
  autoFetch = true,
}: PostsProviderProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<PostsCursor | null>(null);

  const isFetchingRef = useRef(false);
  const isFetchingMoreRef = useRef(false);

  const fetchPosts = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const page = await repository.getPosts(undefined, pageSize);
      setPosts(page.posts);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить публикации",
      );
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [repository, pageSize]);

  const fetchMorePosts = useCallback(async () => {
    if (!nextCursor || isFetchingMoreRef.current || isFetchingRef.current) {
      return;
    }

    isFetchingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await repository.getPosts(nextCursor, pageSize);

      setPosts((prev) => mergePostsDeduplicated(prev, page.posts));
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить следующие публикации",
      );
    } finally {
      setLoadingMore(false);
      isFetchingMoreRef.current = false;
    }
  }, [repository, nextCursor, pageSize]);

  const refreshPosts = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (autoFetch) {
      fetchPosts();
    }
  }, [autoFetch, fetchPosts]);

  const publishPost = useCallback(
    async (input: CreatePostInput, entities = mentionEntities): Promise<Post> => {
      setIsMutating(true);
      setMutationError(null);
      try {
        const created = await repository.createPost(input, entities);
        setPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        return created;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось опубликовать запись";
        setMutationError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [repository, mentionEntities],
  );

  const updatePost = useCallback(
    async (
      postId: string,
      input: Partial<CreatePostInput>,
      entities = mentionEntities,
    ): Promise<Post> => {
      setIsMutating(true);
      setMutationError(null);
      try {
        const updated = await repository.updatePost(postId, input, entities);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, ...updated } : p)),
        );
        return updated;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось обновить запись";
        setMutationError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [repository, mentionEntities],
  );

  const deletePost = useCallback(
    async (postId: string): Promise<void> => {
      setIsMutating(true);
      setMutationError(null);
      try {
        await repository.deletePost(postId);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось удалить запись";
        setMutationError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [repository],
  );

  const addComment = useCallback(
    async (postId: string, content: string): Promise<PostComment> => {
      setIsMutating(true);
      setMutationError(null);
      try {
        const comment = await repository.createComment(postId, content);
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const existingComments = p.comments ?? [];
            return {
              ...p,
              comments: [
                ...existingComments.filter((c) => c.id !== comment.id),
                comment,
              ],
            };
          }),
        );
        return comment;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось добавить комментарий";
        setMutationError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [repository],
  );

  const updateComment = useCallback(
    async (
      commentId: string,
      content: string,
      postId?: string,
    ): Promise<PostComment> => {
      setIsMutating(true);
      setMutationError(null);
      try {
        const updated = await repository.updateComment(commentId, content);
        setPosts((prev) =>
          prev.map((p) => {
            if (postId && p.id !== postId) return p;
            if (!p.comments?.some((c) => c.id === commentId)) return p;
            return {
              ...p,
              comments: p.comments.map((c) => (c.id === commentId ? updated : c)),
            };
          }),
        );
        return updated;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось обновить комментарий";
        setMutationError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [repository],
  );

  const deleteComment = useCallback(
    async (commentId: string, postId?: string): Promise<void> => {
      setIsMutating(true);
      setMutationError(null);
      try {
        await repository.deleteComment(commentId);
        setPosts((prev) =>
          prev.map((p) => {
            if (postId && p.id !== postId) return p;
            if (!p.comments?.some((c) => c.id === commentId)) return p;
            return {
              ...p,
              comments: p.comments.filter((c) => c.id !== commentId),
            };
          }),
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось удалить комментарий";
        setMutationError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [repository],
  );

  const acceptAnswer = useCallback((postId: string, commentId: string) => {
    setPosts((prev) => acceptAnswerOn(prev, postId, commentId));
  }, []);

  const getPost = useCallback(
    async (id: string): Promise<Post | null> => {
      const local = posts.find((p) => p.id === id);
      if (local && local.comments && local.comments.length > 0) {
        return local;
      }
      try {
        const remote = await repository.getPost(id);
        if (remote) {
          setPosts((prev) => prev.map((p) => (p.id === id ? remote : p)));
          return remote;
        }
      } catch (err) {
        console.warn("Failed to fetch post detail:", err);
      }
      return local ?? null;
    },
    [repository, posts],
  );

  const getComments = useCallback(
    async (postId: string): Promise<PostComment[]> => {
      try {
        const comments = await repository.getComments(postId);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments } : p)),
        );
        return comments;
      } catch (err) {
        console.warn("Failed to fetch post comments:", err);
        const local = posts.find((p) => p.id === postId);
        return local?.comments ?? [];
      }
    },
    [repository, posts],
  );

  const hasMore = useMemo(() => nextCursor !== null, [nextCursor]);

  const value = useMemo<PostsState>(
    () => ({
      posts,
      loading,
      loadingMore,
      isMutating,
      error,
      mutationError,
      nextCursor,
      hasMore,
      fetchPosts,
      fetchMorePosts,
      refreshPosts,
      publishPost,
      updatePost,
      deletePost,
      addComment,
      updateComment,
      deleteComment,
      acceptAnswer,
      getPost,
      getComments,
    }),
    [
      posts,
      loading,
      loadingMore,
      isMutating,
      error,
      mutationError,
      nextCursor,
      hasMore,
      fetchPosts,
      fetchMorePosts,
      refreshPosts,
      publishPost,
      updatePost,
      deletePost,
      addComment,
      updateComment,
      deleteComment,
      acceptAnswer,
      getPost,
      getComments,
    ],
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
}

export function usePosts(): PostsState {
  const ctx = useContext(PostsContext);
  if (!ctx) {
    throw new Error("usePosts must be used within PostsProvider");
  }
  return ctx;
}
