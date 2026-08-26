import { useState } from "react";
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
  const { setAddOpen } = useHub();
  const {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    fetchMorePosts,
    updatePost,
    deletePost,
  } = usePosts();
  const [category, setCategory] = useState("all");

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Post | null>(null);

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
      ) : posts.length === 0 ? (
        <EmptyState>
          <p>В ленте пока нет публикаций.</p>
          <p style={{ marginTop: 8 }}>
            <button
              type="button"
              className={styles.shareLinkBtn}
              onClick={() => setAddOpen(true)}
            >
              Нажмите здесь, чтобы поделиться
            </button>{" "}
            обсуждением, гайдом или проектом!
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

      {/* Full Post Detail Modal */}
      {activeDetailPost ? (
        <PostDetailModal
          post={activeDetailPost}
          onClose={() => setSelectedPostId(null)}
        />
      ) : null}

      {/* Edit Post Modal */}
      {editingPost ? (
        <EditPostModal
          post={editingPost}
          isOpen={Boolean(editingPost)}
          onClose={() => setEditingPost(null)}
          onSave={(id, input) => {
            updatePost(id, input);
            setEditingPost(null);
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
          onConfirm={() => {
            deletePost(deleteConfirmPost.id);
            if (selectedPostId === deleteConfirmPost.id) {
              setSelectedPostId(null);
            }
            setDeleteConfirmPost(null);
          }}
        />
      ) : null}
    </div>
  );
}
