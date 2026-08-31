import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CategoryStrip } from "../../components/CategoryStrip/CategoryStrip";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { IconButton } from "../../components/IconButton/IconButton";
import { IconBookmark } from "../../components/icons";
import { ModelRow } from "../../components/ModelRow";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { RepositoryRow } from "../../components/RepositoryRow";
import { ToolRow } from "../../components/ToolRow";
import { Select } from "../../components/ui/Select";
import { PostCard } from "../../features/community/PostCard";
import { PostDetailModal } from "../../features/community/PostDetailModal";
import { usePosts } from "../../features/posts";
import { formatDateTime } from "../../lib/datetime";
import { filterAndSortModels } from "../../services/models";
import { profileService } from "../../services/profile";
import { isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { Model, Tool } from "../../types/hub";
import type { ModelSort } from "../../types/models";
import type { Post } from "../../types/posts";
import type { SavedItem } from "../../types/saved";
import styles from "./Library.module.css";

type TabId = "all" | "model" | "tool" | "repository" | "post" | "comment";

const CAPABILITY_OPTIONS = [
  { value: "vision", label: "Vision" },
  { value: "reasoning", label: "Reasoning" },
  { value: "tools", label: "Tools" },
  { value: "audio", label: "Audio" },
  { value: "free", label: "Бесплатные" },
];

const SORT_OPTIONS: { value: ModelSort; label: string }[] = [
  { value: "catalog", label: "Каталог" },
  { value: "new", label: "Новые" },
  { value: "context-desc", label: "Контекст: больше" },
  { value: "context-asc", label: "Контекст: меньше" },
  { value: "price-asc", label: "Цена: дешевле" },
  { value: "name", label: "Название (A–Z)" },
];

interface BookmarksPageProps {
  showHeader?: boolean;
}

export function BookmarksPage({ showHeader = true }: BookmarksPageProps) {
  const navigate = useNavigate();
  const {
    savedItems,
    models,
    tools,
    toggleModelBookmark,
    toggleToolBookmark,
    toggleSavedTarget,
    openEntity,
  } = useHub();

  const { posts } = usePosts();

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedDetailPostId, setSelectedDetailPostId] = useState<string | null>(null);
  const [targetCommentId, setTargetCommentId] = useState<string | null>(null);

  // Model filter states
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [provider, setProvider] = useState("all");
  const [sort, setSort] = useState<ModelSort>("catalog");

  // Resolve saved models preserving saved order
  const savedModels = useMemo(() => {
    const modelById = new Map(models.map((m) => [m.id, m]));
    return savedItems
      .filter((item) => item.kind === "model")
      .map((item) => modelById.get(item.targetId))
      .filter((m): m is Model => Boolean(m));
  }, [savedItems, models]);

  // Resolve saved tools preserving saved order
  const savedTools = useMemo(() => {
    const toolById = new Map(tools.map((t) => [t.id, t]));
    return savedItems
      .filter((item) => item.kind === "tool")
      .map((item) => toolById.get(item.targetId))
      .filter((t): t is Tool => Boolean(t));
  }, [savedItems, tools]);

  // Resolve saved repositories
  const savedRepositories = useMemo(() => {
    return savedItems.filter((item) => item.kind === "repository");
  }, [savedItems]);

  // Resolve saved posts
  const savedPosts = useMemo(() => {
    const postItems = savedItems.filter((item) => item.kind === "post");
    const postById = new Map(posts.map((p) => [p.id, p]));

    return postItems.map((item): Post => {
      const livePost = postById.get(item.targetId);
      if (livePost) return livePost;

      // Fallback synthetic post constructed from saved item metadata
      return {
        id: item.targetId,
        type: "discussion",
        author: {
          id: item.authorHandle || "author",
          name: item.authorName || item.subtitle || "Автор",
          handle: item.authorHandle || "user",
          avatarUrl: item.authorAvatar,
          initials: profileService.getInitials(item.authorName, item.authorHandle),
        },
        title: item.title,
        content: item.description || "",
        createdAt: item.savedAt || new Date().toISOString(),
        tags: [],
        relatedEntities: [],
        reactions: [],
        comments: [],
        extras: item.url ? { url: item.url } : {},
      };
    });
  }, [savedItems, posts]);

  // Resolve saved comments
  const savedComments = useMemo(() => {
    return savedItems.filter((item) => item.kind === "comment");
  }, [savedItems]);

  // Categories with live computed counts
  const categories = useMemo(
    () => [
      { id: "all" as const, label: "Все", count: savedItems.length },
      { id: "model" as const, label: "Модели", count: savedModels.length },
      { id: "tool" as const, label: "Инструменты", count: savedTools.length },
      { id: "repository" as const, label: "Репозитории", count: savedRepositories.length },
      { id: "post" as const, label: "Посты", count: savedPosts.length },
      { id: "comment" as const, label: "Комментарии", count: savedComments.length },
    ],
    [
      savedItems.length,
      savedModels.length,
      savedTools.length,
      savedRepositories.length,
      savedPosts.length,
      savedComments.length,
    ],
  );

  // Dynamic providers computed solely from saved models
  const savedProviders = useMemo(
    () => [...new Set(savedModels.map((m) => m.provider))].sort((a, b) => a.localeCompare(b)),
    [savedModels],
  );

  const providerOptions = useMemo(() => {
    const allOpt = { value: "all", label: `Все (${savedProviders.length})` };
    return [allOpt, ...savedProviders.map((p) => ({ value: p, label: p }))];
  }, [savedProviders]);

  // Filtered saved models
  const filteredSavedModels = useMemo(
    () =>
      filterAndSortModels(savedModels, {
        capabilities,
        provider,
        sort,
      }),
    [savedModels, capabilities, provider, sort],
  );

  const hasActiveModelFilters = capabilities.length > 0 || provider !== "all";

  const handleOpenComment = (commentItem: SavedItem) => {
    const postId = commentItem.postId || commentItem.targetId;
    const commentId = commentItem.commentId || commentItem.targetId;
    // Check if post is currently loaded in memory
    const existingPost = posts.find((p) => p.id === postId);
    if (existingPost) {
      setSelectedDetailPostId(postId);
      setTargetCommentId(commentId);
    } else {
      navigate({
        to: `/posts/${postId}`,
        search: { comment: commentId },
      });
    }
  };

  const activeModalPost = posts.find((p) => p.id === selectedDetailPostId) || null;

  const renderContentControls = () => (
    <div className={styles.filterBar}>
      <CategoryStrip
        items={categories}
        value={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />
      {activeTab === "model" && savedModels.length > 0 ? (
        <div className={styles.toolbar}>
          <Select
            label="Provider"
            value={provider}
            options={providerOptions}
            onChange={setProvider}
            searchable={savedProviders.length > 5}
            searchPlaceholder="Поиск провайдера..."
          />
          <Select
            label="Возможности"
            multiple
            value={capabilities}
            options={CAPABILITY_OPTIONS}
            onChange={setCapabilities}
            placeholder="Все"
          />
          <Select
            label="Сортировка"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(val) => setSort(val as ModelSort)}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={styles.page}>
      {showHeader ? (
        <PageHeader title="Закладки">{renderContentControls()}</PageHeader>
      ) : (
        renderContentControls()
      )}

      {savedItems.length === 0 ? (
        <EmptyState>
          <p>Здесь появятся сохранённые модели, инструменты, репозитории, посты и комментарии.</p>
        </EmptyState>
      ) : activeTab === "all" ? (
        <>
          {savedModels.length > 0 ? (
            <section aria-label="Сохранённые модели">
              <h3 className={styles.groupTitle}>Модели</h3>
              <ul className={styles.list}>
                {savedModels.map((model) => (
                  <li key={model.id} id={`saved-model-${model.id.replace(/\//g, "-")}`}>
                    <ModelRow
                      model={model}
                      bookmarked={isSaved(savedItems, "model", model.id)}
                      onBookmark={() => toggleModelBookmark(model.id)}
                      onOpen={() => openEntity("model", model.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {savedTools.length > 0 ? (
            <section aria-label="Сохранённые инструменты">
              <h3 className={styles.groupTitle}>Инструменты</h3>
              <ul className={styles.list}>
                {savedTools.map((tool) => (
                  <li key={tool.id} id={`saved-tool-${tool.id}`}>
                    <ToolRow
                      tool={tool}
                      bookmarked={isSaved(savedItems, "tool", tool.id)}
                      onBookmark={() => toggleToolBookmark(tool.id)}
                      onOpen={() => openEntity("tool", tool.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {savedRepositories.length > 0 ? (
            <section aria-label="Сохранённые репозитории">
              <h3 className={styles.groupTitle}>Репозитории</h3>
              <ul className={styles.list}>
                {savedRepositories.map((repo) => (
                  <li key={repo.id} id={`saved-repo-${repo.targetId.replace(/\//g, "-")}`}>
                    <RepositoryRow
                      item={repo}
                      bookmarked={true}
                      onBookmark={() => toggleSavedTarget(repo)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {savedPosts.length > 0 ? (
            <section aria-label="Сохранённые публикации">
              <h3 className={styles.groupTitle}>Посты</h3>
              <ul className={styles.postGrid}>
                {savedPosts.map((post) => (
                  <li key={post.id}>
                    <PostCard
                      post={post}
                      onClick={() => {
                        setSelectedDetailPostId(post.id);
                        setTargetCommentId(null);
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {savedComments.length > 0 ? (
            <section aria-label="Сохранённые комментарии">
              <h3 className={styles.groupTitle}>Комментарии</h3>
              <ul className={styles.commentsList}>
                {savedComments.map((comment) => (
                  <li key={comment.id}>
                    <div
                      className={styles.savedCommentCard}
                      onClick={() => handleOpenComment(comment)}
                    >
                      <div className={styles.savedCommentHead}>
                        <div className={styles.savedCommentAuthor}>
                          {comment.authorAvatar ? (
                            <img
                              src={comment.authorAvatar}
                              alt=""
                              className={styles.savedCommentAvatarImg}
                            />
                          ) : (
                            <div className={styles.savedCommentAvatar}>
                              <span>
                                {profileService.getInitials(
                                  comment.authorName,
                                  comment.authorHandle,
                                )}
                              </span>
                            </div>
                          )}
                          <span className={styles.savedCommentAuthorName}>
                            {comment.authorName || "Пользователь"}
                          </span>
                          <span className={styles.dot}>·</span>
                          <span className={styles.savedCommentDate}>
                            {formatDateTime(comment.savedAt)}
                          </span>
                        </div>
                        <IconButton
                          label="Удалить из закладок"
                          active={true}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSavedTarget(comment);
                          }}
                        >
                          <IconBookmark width={16} height={16} />
                        </IconButton>
                      </div>
                      <p className={styles.savedCommentBody}>
                        «{comment.description || comment.title}»
                      </p>
                      {comment.subtitle ? (
                        <div className={styles.savedCommentContext}>
                          в посте:{" "}
                          <span className={styles.savedCommentPostTitle}>
                            «{comment.subtitle}»
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : activeTab === "model" ? (
        savedModels.length === 0 ? (
          <EmptyState>
            <p>Сохранённых моделей пока нет.</p>
          </EmptyState>
        ) : filteredSavedModels.length === 0 ? (
          <EmptyState>
            <p>Среди сохранённых моделей ничего не найдено.</p>
            {hasActiveModelFilters ? (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => {
                  setCapabilities([]);
                  setProvider("all");
                }}
              >
                Сбросить фильтры
              </button>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <div className={styles.countInfo}>
              Показано моделей: {filteredSavedModels.length}
              {filteredSavedModels.length !== savedModels.length ? ` из ${savedModels.length}` : ""}
            </div>
            <ul className={styles.list}>
              {filteredSavedModels.map((model) => (
                <li key={model.id} id={`saved-model-${model.id.replace(/\//g, "-")}`}>
                  <ModelRow
                    model={model}
                    bookmarked={isSaved(savedItems, "model", model.id)}
                    onBookmark={() => toggleModelBookmark(model.id)}
                    onOpen={() => openEntity("model", model.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )
      ) : activeTab === "tool" ? (
        savedTools.length === 0 ? (
          <EmptyState>
            <p>Сохранённых инструментов пока нет.</p>
          </EmptyState>
        ) : (
          <ul className={styles.list}>
            {savedTools.map((tool) => (
              <li key={tool.id} id={`saved-tool-${tool.id}`}>
                <ToolRow
                  tool={tool}
                  bookmarked={isSaved(savedItems, "tool", tool.id)}
                  onBookmark={() => toggleToolBookmark(tool.id)}
                  onOpen={() => openEntity("tool", tool.id)}
                />
              </li>
            ))}
          </ul>
        )
      ) : activeTab === "repository" ? (
        savedRepositories.length === 0 ? (
          <EmptyState>
            <p>Сохранённых репозиториев пока нет.</p>
          </EmptyState>
        ) : (
          <ul className={styles.list}>
            {savedRepositories.map((repo) => (
              <li key={repo.id} id={`saved-repo-${repo.targetId.replace(/\//g, "-")}`}>
                <RepositoryRow
                  item={repo}
                  bookmarked={true}
                  onBookmark={() => toggleSavedTarget(repo)}
                />
              </li>
            ))}
          </ul>
        )
      ) : activeTab === "post" ? (
        savedPosts.length === 0 ? (
          <EmptyState>
            <p>Сохранённых публикаций пока нет.</p>
          </EmptyState>
        ) : (
          <ul className={styles.postGrid}>
            {savedPosts.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  onClick={() => {
                    setSelectedDetailPostId(post.id);
                    setTargetCommentId(null);
                  }}
                />
              </li>
            ))}
          </ul>
        )
      ) : activeTab === "comment" ? (
        savedComments.length === 0 ? (
          <EmptyState>
            <p>Сохранённых комментариев пока нет.</p>
          </EmptyState>
        ) : (
          <ul className={styles.commentsList}>
            {savedComments.map((comment) => (
              <li key={comment.id}>
                <div
                  className={styles.savedCommentCard}
                  onClick={() => handleOpenComment(comment)}
                >
                  <div className={styles.savedCommentHead}>
                    <div className={styles.savedCommentAuthor}>
                      {comment.authorAvatar ? (
                        <img
                          src={comment.authorAvatar}
                          alt=""
                          className={styles.savedCommentAvatarImg}
                        />
                      ) : (
                        <div className={styles.savedCommentAvatar}>
                          <span>
                            {profileService.getInitials(
                              comment.authorName,
                              comment.authorHandle,
                            )}
                          </span>
                        </div>
                      )}
                      <span className={styles.savedCommentAuthorName}>
                        {comment.authorName || "Пользователь"}
                      </span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.savedCommentDate}>
                        {formatDateTime(comment.savedAt)}
                      </span>
                    </div>
                    <IconButton
                      label="Удалить из закладок"
                      active={true}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSavedTarget(comment);
                      }}
                    >
                      <IconBookmark width={16} height={16} />
                    </IconButton>
                  </div>
                  <p className={styles.savedCommentBody}>
                    «{comment.description || comment.title}»
                  </p>
                  {comment.subtitle ? (
                    <div className={styles.savedCommentContext}>
                      в посте:{" "}
                      <span className={styles.savedCommentPostTitle}>
                        «{comment.subtitle}»
                      </span>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {/* Post Detail Modal */}
      {activeModalPost ? (
        <PostDetailModal
          post={activeModalPost}
          allPosts={posts}
          targetCommentId={targetCommentId}
          onClose={() => {
            setSelectedDetailPostId(null);
            setTargetCommentId(null);
          }}
          onSelectPost={(id) => {
            setSelectedDetailPostId(id);
            setTargetCommentId(null);
          }}
        />
      ) : null}
    </div>
  );
}

export { CollectionsPage } from "./CollectionsPage";
export { SavedPage } from "../Saved";
