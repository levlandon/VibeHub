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
import { useI18n } from "../../i18n";
import styles from "./FeedPage.module.css";

const FEED_CATEGORIES = [
  { id: "all", key: "feed.all" },
  { id: "models", key: "nav.models" },
  { id: "tools", key: "feed.tools" },
  { id: "agents", key: "feed.agents" },
  { id: "mcp", key: "feed.mcp" },
] as const;

export function FeedPage() {
  const { t } = useI18n();
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
  const feedCategories = FEED_CATEGORIES.map((item) => ({ id: item.id, label: t(item.key) }));

  return (
    <div className={styles.page}>
      <PageHeader title={t("feed.title")}>
        <CategoryStrip
          items={feedCategories}
          value={category}
          onChange={setCategory}
        />
      </PageHeader>

      {loading && posts.length === 0 ? (
        <FeedSkeletonList count={3} label={t("common.loadingPosts")} />
      ) : error && posts.length === 0 ? (
        <EmptyState>
          <p>{t("feed.loadError")}</p>
          <Button variant="ghost" onClick={() => void refreshPosts()}>
            {t("common.retry")}
          </Button>
        </EmptyState>
      ) : posts.length === 0 ? (
        <EmptyState>
          <p>{t("feed.empty")}</p>
          <p style={{ marginTop: 8 }}>
            <button
              type="button"
              className={styles.shareLinkBtn}
              onClick={() => setAddOpen(true)}
            >
              {t("feed.createPrompt")}
            </button>{" "}
            {t("feed.createSuffix")}
          </p>
        </EmptyState>
      ) : visiblePosts.length === 0 ? (
        <EmptyState>
          <p>
            {t("feed.categoryEmpty", {
              category: feedCategories.find((c) => c.id === category)?.label ?? category,
            })}
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
                {loadingMore ? t("feed.loading") : t("feed.loadMore")}
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
              setMutationMessage(t("feed.updateError"));
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
          title={t("feed.deleteTitle", { title: deleteConfirmPost.title })}
          body={t("feed.deleteBody")}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("common.delete")}
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
            } catch {
              setMutationMessage(t("feed.deleteError"));
            } finally {
              setMutationPending(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
