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
  addComment as addCommentOn,
  createPost,
  deletePost as deletePostOn,
  mergePostsDeduplicated,
  updatePost as updatePostOn,
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
  error: string | null;
  nextCursor: PostsCursor | null;
  hasMore: boolean;
  fetchPosts: () => Promise<void>;
  fetchMorePosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  publishPost: (input: CreatePostInput, entities?: EntityRef[]) => void;
  updatePost: (postId: string, input: Partial<CreatePostInput>, entities?: EntityRef[]) => void;
  deletePost: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
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
  const [error, setError] = useState<string | null>(null);
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
    (input: CreatePostInput, entities = mentionEntities) => {
      setPosts((prev) => [createPost(input, entities), ...prev]);
    },
    [mentionEntities],
  );

  const updatePost = useCallback(
    (postId: string, input: Partial<CreatePostInput>, entities = mentionEntities) => {
      setPosts((prev) => updatePostOn(prev, postId, input, entities));
    },
    [mentionEntities],
  );

  const deletePost = useCallback((postId: string) => {
    setPosts((prev) => deletePostOn(prev, postId));
  }, []);

  const addComment = useCallback((postId: string, content: string) => {
    setPosts((prev) => addCommentOn(prev, postId, content));
  }, []);

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
      error,
      nextCursor,
      hasMore,
      fetchPosts,
      fetchMorePosts,
      refreshPosts,
      publishPost,
      updatePost,
      deletePost,
      addComment,
      acceptAnswer,
      getPost,
      getComments,
    }),
    [
      posts,
      loading,
      loadingMore,
      error,
      nextCursor,
      hasMore,
      fetchPosts,
      fetchMorePosts,
      refreshPosts,
      publishPost,
      updatePost,
      deletePost,
      addComment,
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
