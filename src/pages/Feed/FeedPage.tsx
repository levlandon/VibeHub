import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "../../components/Button/Button";
import { CategoryStrip } from "../../components/CategoryStrip/CategoryStrip";
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { FeedSkeletonList } from "../../components/Skeleton";
import { EditPostModal } from "../../features/community/EditPostModal";
import { PostCard } from "../../features/community/PostCard";
import { PostDetailModal } from "../../features/community/PostDetailModal";
import { usePosts } from "../../features/posts";
import { filterPostsByCategory } from "../../services/posts";
import { useHub } from "../../state/HubContext";
import type { Post } from "../../types/posts";
import styles from "./FeedPage.module.css";

const FEED_CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "models", label: "Модели" },
  { id: "tools", label: "Инструменты" },
  { id: "agents", label: "Агенты" },
  { id: "mcp", label: "MCP" },
];

export function FeedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAddOpen } = useHub();
  const {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    fetchMorePosts,
    refreshPosts,
    updatePost,
    deletePost,
  } = usePosts();
  const [category, setCategory] = useState("all");

  const pathPostMatch = location.pathname.match(/^\/posts\/([^/?#]+)/);
  const routePostId = pathPostMatch ? decodeURIComponent(pathPostMatch[1]) : null;
  const search = location.search as { comment?: string } | undefined;
  const targetCommentId = search?.comment || null;

  const [selectedPostId, setSelectedPostId] = useState<string | null>(routePostId);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [mutationPending, setMutationPending] = useState(false);

  useEffect(() => {
    if (routePostId) {
      setSelectedPostId(routePostId);
    }
  }, [routePostId]);

  const visiblePosts = filterPostsByCategory(posts, category);
  const activeDetailPost = posts.find((p) => p.id === selectedPostId) || null;

  return (
    <div className={styles.page}>
      <PageHeader title="Лента сообщества">
        <CategoryStrip
          items={FEED_CATEGORIES}
          value={category}
          onChange={setCategory}
        />
      </PageHeader>

      {loading && posts.length === 0 ? (
        <FeedSkeletonList count={3} />
      ) : error && posts.length === 0 ? (
        <EmptyState>
          <p>Не удалось загрузить публикации.</p>
          <Button variant="ghost" onClick={() => void refreshPosts()}>
            Повторить
          </Button>
        </EmptyState>
      ) : posts.length === 0 ? (
        <EmptyState>
          <p>В ленте пока нет публикаций.</p>
          <p style={{ marginTop: 8 }}>
            <button
              type="button"
              className={styles.shareLinkBtn}
              onClick={() => setAddOpen(true)}
            >
              Нажмите здесь, чтобы создать
            </button>{" "}
            обсуждение, вопрос или проект!
          </p>
        </EmptyState>
      ) : visiblePosts.length === 0 ? (
        <EmptyState>
          <p>
            Нет публикаций в категории &laquo;
            {FEED_CATEGORIES.find((c) => c.id === category)?.label}&raquo;.
          </p>
        </EmptyState>
      ) : (
        <>
          <ul className={styles.feedGrid}>
            {visiblePosts.map((post) => (
              <li key={post.id} className={styles.gridItem}>
                <PostCard
                  post={post}
                  onClick={() => setSelectedPostId(post.id)}
                  onEdit={() => setEditingPost(post)}
                  onDelete={() => setDeleteConfirmPost(post)}
                />
              </li>
            ))}
          </ul>

          {hasMore ? (
            <div className={styles.paginationWrap}>
              <Button
                variant="ghost"
                className={styles.loadMoreBtn}
                disabled={loadingMore}
                onClick={fetchMorePosts}
              >
                {loadingMore ? "Загрузка..." : "Показать ещё"}
              </Button>
              {error ? <p className={styles.errorMessage}>{error}</p> : null}
            </div>
          ) : null}
        </>
      )}

      {mutationMessage ? (
        <p className={styles.errorMessage} role="alert">{mutationMessage}</p>
      ) : null}

      {/* Full Post Detail Modal */}
      {activeDetailPost ? (
        <PostDetailModal
          post={activeDetailPost}
          allPosts={posts}
          targetCommentId={targetCommentId}
          onClose={() => {
            setSelectedPostId(null);
            if (routePostId) {
              navigate({ to: "/feed", replace: true });
            }
          }}
          onSelectPost={setSelectedPostId}
        />
      ) : null}

      {/* Edit Post Modal */}
      {editingPost ? (
        <EditPostModal
          post={editingPost}
          isOpen={Boolean(editingPost)}
          onClose={() => setEditingPost(null)}
          onSave={async (id, input) => {
            setMutationPending(true);
            setMutationMessage(null);
            try {
              await updatePost(id, input);
              setEditingPost(null);
            } catch (err) {
              setMutationMessage(
                err instanceof Error ? err.message : "Не удалось сохранить публикацию",
              );
              throw err;
            } finally {
              setMutationPending(false);
            }
          }}
        />
      ) : null}

      {/* Delete Confirmation */}
      {deleteConfirmPost ? (
        <ConfirmDialog
          title={`Удалить публикацию «${deleteConfirmPost.title}»?`}
          body="Это действие нельзя будет отменить."
          cancelLabel="Отмена"
          confirmLabel="Удалить"
          onCancel={() => setDeleteConfirmPost(null)}
          onConfirm={async () => {
            if (mutationPending) return;
            setMutationPending(true);
            setMutationMessage(null);
            try {
              await deletePost(deleteConfirmPost.id);
              if (selectedPostId === deleteConfirmPost.id) {
                setSelectedPostId(null);
              }
              setDeleteConfirmPost(null);
            } catch (err) {
              setMutationMessage(
                err instanceof Error ? err.message : "Не удалось удалить публикацию",
              );
            } finally {
              setMutationPending(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
