import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { IconButton } from "../../components/IconButton/IconButton";
import {
  IconBookmark,
  IconClose,
  IconLink,
  IconMore,
  IconPlus,
  IconReply,
  IconSend,
} from "../../components/icons";
import { ProfileHoverCard } from "../../components/ProfileHoverCard";
import { RichText } from "../../components/mentions/RichText";
import { formatDateTime } from "../../lib/datetime";
import { mentionIndex } from "../../services/entities";
import { computeRelatedPosts } from "../../services/posts/relatedPosts";
import { profileService } from "../../services/profile";
import { describeComment, describePost, isSaved } from "../../services/saved";
import { useHub } from "../../state/HubContext";
import type { EntityRef } from "../../types/entities";
import type { ChatAuthor } from "../../types/hub";
import type { Post, PostComment } from "../../types/posts";
import { usePosts } from "../posts";
import { questionStatus } from "./postTypes";
import styles from "./PostDetailModal.module.css";
import { useI18n } from "../../i18n";

const CATEGORY_LABELS: Record<string, string> = {
  models: "nav.models",
  tools: "feed.tools",
  agents: "feed.agents",
  mcp: "feed.mcp",
};

export interface PostDetailModalProps {
  post: Post | null;
  allPosts?: Post[];
  targetCommentId?: string | null;
  onClose: () => void;
  onSelectPost?: (postId: string) => void;
}

export function PostDetailModal({
  post,
  allPosts = [],
  targetCommentId,
  onClose,
  onSelectPost,
}: PostDetailModalProps) {
  const { language, t } = useI18n();
  const {
    models,
    tools,
    savedItems,
    toggleSavedTarget,
    openProfile,
    authStatus,
    setAuthModalOpen,
    userProfile,
  } = useHub();

  const {
    acceptAnswer,
    addComment,
    deleteComment,
    getComments,
    isMutating,
  } = usePosts();

  const [commentError, setCommentError] = useState<string | null>(null);
  const [activeReplyTarget, setActiveReplyTarget] = useState<{
    postId: string;
    commentId: string;
    rootCommentId: string;
    author: ChatAuthor;
    content: string;
  } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [composerHeight, setComposerHeight] = useState<number>(80);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(
    targetCommentId || null,
  );
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);

  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);

  // Fetch comments if needed
  useEffect(() => {
    if (post?.id && (!post.comments || post.comments.length === 0)) {
      getComments(post.id);
    }
  }, [post?.id, post?.comments, getComments]);

  // Deep-link scroll & highlight target comment
  useEffect(() => {
    if (!targetCommentId || !post?.comments || post.comments.length === 0) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`comment-${targetCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedCommentId(targetCommentId);
      }
    }, 120);

    const clearHighlightTimer = setTimeout(() => {
      setHighlightedCommentId(null);
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearHighlightTimer);
    };
  }, [targetCommentId, post?.comments]);

  // Adjust textarea auto-grow height
  const adjustTextareaHeight = () => {
    const textarea = replyTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(140, Math.max(32, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [replyText]);

  // Measure composer height for dynamic scroll area bottom padding
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    const updateHeight = () => {
      setComposerHeight(composer.offsetHeight);
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(composer);
      return () => observer.disconnect();
    }
  }, [activeReplyTarget, replyText]);

  // Reset transient discussion state & scroll positions whenever active post changes
  useEffect(() => {
    setActiveReplyTarget(null);
    setOpenCommentMenuId(null);
    setReplyText("");
    setCommentError(null);
    leftPaneRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    commentsScrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [post?.id]);

  // Safety guard: ensure activeReplyTarget belongs to current post and comment still exists
  useEffect(() => {
    if (!activeReplyTarget || !post) return;
    if (activeReplyTarget.postId !== post.id) {
      setActiveReplyTarget(null);
      return;
    }
    const commentExists = post.comments?.some(
      (c) => c.id === activeReplyTarget.commentId && !c.deletedAt,
    );
    if (!commentExists) {
      setActiveReplyTarget(null);
    }
  }, [post, activeReplyTarget]);

  // Global key listener for Escape: closes menu first if open, else closes modal
  useEffect(() => {
    if (!post) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openCommentMenuId) {
          e.stopPropagation();
          setOpenCommentMenuId(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [post, onClose, openCommentMenuId]);

  // Dynamically index authors present in the post & comments for @User mentions
  const effectiveMentionEntities = useMemo(() => {
    if (!post) return mentionIndex(models, tools);
    const authors: ChatAuthor[] = [
      post.author,
      ...(post.comments?.map((c) => c.author) || []),
    ];
    return mentionIndex(models, tools, authors);
  }, [models, tools, post]);

  // Deterministically compute related posts
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return computeRelatedPosts(post, allPosts, 3);
  }, [post, allPosts]);

  if (!post) return null;

  const saved = isSaved(savedItems, "post", post.id);
  const status = questionStatus(post);
  const categoryKey = post.category ? CATEGORY_LABELS[post.category] : undefined;
  const categoryLabel = categoryKey
    ? t(categoryKey)
    : post.category;
  const postTypeLabel = t(`composer.${post.type}`);
  const badgeText = categoryLabel
    ? `${categoryLabel} · ${postTypeLabel}`
    : postTypeLabel;

  const currentUserInitials = profileService.getInitials(
    userProfile?.displayName,
    userProfile?.username,
  );

  // Count active non-deleted comments
  const activeCommentsCount = (post.comments || []).filter(
    (c) => !c.deletedAt,
  ).length;

  // Comments sorted chronologically
  const sortedComments = [...(post.comments || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Map of all comments by id for target author lookup
  const commentsById = new Map<string, PostComment>();
  for (const c of sortedComments) {
    commentsById.set(c.id, c);
  }

  // Separate root comments and replies (1-level visual nesting)
  const rootComments = sortedComments.filter((c) => !c.parentCommentId);

  // Group replies by root parentCommentId
  const repliesByRoot = new Map<string, PostComment[]>();
  for (const c of sortedComments) {
    if (c.parentCommentId) {
      const list = repliesByRoot.get(c.parentCommentId) || [];
      list.push(c);
      repliesByRoot.set(c.parentCommentId, list);
    }
  }

  // Visible root comments: active roots OR deleted roots that have active replies
  const visibleRootComments = rootComments.filter((root) => {
    if (!root.deletedAt) return true;
    const replies = repliesByRoot.get(root.id) || [];
    const activeReplies = replies.filter((r) => !r.deletedAt);
    return activeReplies.length > 0;
  });

  const handleStartReply = (comment: PostComment, rootId: string) => {
    setOpenCommentMenuId(null);
    setActiveReplyTarget({
      postId: post.id,
      commentId: comment.id,
      rootCommentId: rootId,
      author: comment.author,
      content: comment.content,
    });
    setTimeout(() => replyTextareaRef.current?.focus(), 40);
  };

  const handleCancelReplyTarget = () => {
    setActiveReplyTarget(null);
  };

  const handleSelectRelatedPost = (relatedPostId: string) => {
    setActiveReplyTarget(null);
    setOpenCommentMenuId(null);
    setReplyText("");
    setCommentError(null);
    onSelectPost?.(relatedPostId);
  };

  const handleSubmitReply = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || isMutating) return;

    if (authStatus !== "authenticated") {
      setAuthModalOpen(true);
      return;
    }

    setCommentError(null);
    try {
      const parentCommentId = activeReplyTarget
        ? activeReplyTarget.rootCommentId
        : null;
      const replyToCommentId = activeReplyTarget
        ? activeReplyTarget.commentId
        : null;

      await addComment(
        post.id,
        replyText.trim(),
        parentCommentId,
        replyToCommentId,
      );
      setReplyText("");
      setActiveReplyTarget(null);
      if (replyTextareaRef.current) {
        replyTextareaRef.current.style.height = "auto";
      }
    } catch {
      setCommentError(t("post.commentSendError"));
    }
  };

  const handleTextareaKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (activeReplyTarget?.commentId === commentId) {
      setActiveReplyTarget(null);
    }
    setOpenCommentMenuId(null);
    try {
      await deleteComment({ postId: post.id, commentId });
    } catch {
      setCommentError(t("post.commentDeleteError"));
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-detail-modal-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Mobile Header with Close Button */}
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderBadge}>{badgeText}</div>
          <IconButton
            className={styles.closeBtnMobile}
            label={t("common.close")}
            onClick={onClose}
          >
            <IconClose width={18} height={18} />
          </IconButton>
        </div>

        {/* 2-Column Responsive Body Layout */}
        <div className={styles.splitLayout}>
          {/* LEFT PANE: Post Content + Related Posts */}
          <div ref={leftPaneRef} className={styles.leftPane}>
            <article className={styles.postBodyContainer}>
              {/* Meta Header */}
              <div className={styles.postHeaderMeta}>
                <div className={styles.metaLeft}>
                  <ProfileHoverCard
                    identifier={post.author.handle || post.author.id}
                    initialAuthor={post.author}
                    onOpenProfile={() => {
                      onClose();
                      openProfile(post.author.handle || post.author.id);
                    }}
                  >
                    <div className={styles.authorAvatar}>
                      {post.author.avatarUrl ? (
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.name}
                          className={styles.avatarImg}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span>
                          {post.author.initials ||
                            profileService.getInitials(
                              post.author.name,
                              post.author.handle,
                            )}
                        </span>
                      )}
                    </div>
                  </ProfileHoverCard>

                  <div className={styles.authorDetails}>
                    <ProfileHoverCard
                      identifier={post.author.handle || post.author.id}
                      initialAuthor={post.author}
                      onOpenProfile={() => {
                        onClose();
                        openProfile(post.author.handle || post.author.id);
                      }}
                    >
                      <button
                        type="button"
                        className={styles.authorNameBtn}
                        onClick={() => {
                          onClose();
                          openProfile(post.author.handle || post.author.id);
                        }}
                      >
                        {post.author.name}
                      </button>
                    </ProfileHoverCard>
                    <span className={styles.dot}>·</span>
                    <span className={styles.date}>
                      {formatDateTime(post.createdAt, language === "ru" ? "ru-RU" : "en-US")}
                    </span>
                  </div>
                </div>

                <div className={styles.postHeaderActions}>
                  <IconButton
                    label={saved ? t("saved.removeBookmark") : t("common.save")}
                    active={saved}
                    onClick={() => toggleSavedTarget(describePost(post))}
                  >
                    <IconBookmark width={16} height={16} />
                  </IconButton>
                </div>
              </div>

              {/* Badges */}
              <div className={styles.badgeRow}>
                <span className={styles.typeBadge}>
                  {badgeText}
                </span>
                  {status ? (
                    <span className={styles.statusBadge}>
                    {status.mark === "✓" ? t("post.solution") : t("composer.question")}
                    </span>
                ) : null}
              </div>

              {/* Title */}
              <h1 id="post-detail-modal-title" className={styles.postTitle}>
                {post.title}
              </h1>

              {/* Content */}
              <div className={styles.postContent}>
                <RichText
                  text={post.content}
                  entities={effectiveMentionEntities}
                />
              </div>

              {/* Link Extra */}
              {post.extras?.url ? (
                <a
                  href={post.extras.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkCard}
                >
                  <IconLink width={14} height={14} className={styles.linkIcon} />
                  <span className={styles.linkUrl}>{post.extras.url}</span>
                </a>
              ) : null}

              {/* Tags */}
              {post.tags && post.tags.length > 0 ? (
                <div className={styles.tagList}>
                  {post.tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>

            {/* Related Posts Section */}
            {relatedPosts.length > 0 ? (
              <section
                className={styles.relatedSection}
                aria-label={t("post.related")}
              >
                <div className={styles.relatedHeading}>{t("post.related")}</div>
                <div className={styles.relatedList}>
                  {relatedPosts.map((relPost) => (
                    <button
                      key={relPost.id}
                      type="button"
                      className={styles.relatedCard}
                      onClick={() => handleSelectRelatedPost(relPost.id)}
                    >
                      <div className={styles.relatedMeta}>
                        <span className={styles.relatedBadge}>
                          {relPost.category
                            ? CATEGORY_LABELS[relPost.category] ||
                              relPost.category
                            : t("composer.discussion")}
                        </span>
                        <span className={styles.relatedDate}>
                          {formatDateTime(relPost.createdAt, language === "ru" ? "ru-RU" : "en-US")}
                        </span>
                      </div>
                      <div className={styles.relatedTitle}>{relPost.title}</div>
                      <div className={styles.relatedAuthor}>
                        {relPost.author.name}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* RIGHT PANE: Comments / Threads + Sticky Composer */}
          <div className={styles.rightPane}>
            {/* Comments Header */}
            <div className={styles.commentsHeader}>
              <div className={styles.commentsTitle}>
                {t("post.discussionCount", { count: activeCommentsCount })}
              </div>
              <IconButton
                className={styles.closeBtnDesktop}
                label={t("common.close")}
                onClick={onClose}
              >
                <IconClose width={18} height={18} />
              </IconButton>
            </div>

            {/* Scrollable Comments Area */}
            <div
              ref={commentsScrollRef}
              className={styles.commentsScrollArea}
              style={{ paddingBottom: `${composerHeight + 16}px` }}
              onScroll={() => {
                if (openCommentMenuId) setOpenCommentMenuId(null);
              }}
            >
              {commentError ? (
                <div className={styles.commentErrorBanner} role="alert">
                  {commentError}
                </div>
              ) : null}

              {visibleRootComments.length === 0 ? (
                <div className={styles.noCommentsWrap}>
                  <p className={styles.noComments}>
                    {t("post.noComments")}
                  </p>
                </div>
              ) : (
                <div className={styles.commentsList}>
                  {visibleRootComments.map((root) => {
                    const replies = (repliesByRoot.get(root.id) || []).filter(
                      (r) => !r.deletedAt,
                    );
                    const isDeletedRoot = Boolean(root.deletedAt);
                    const isRootSelected =
                      activeReplyTarget?.commentId === root.id;
                    const isRootHighlighted =
                      highlightedCommentId === root.id;

                    return (
                      <div
                        key={root.id}
                        className={styles.threadGroup}
                        id={`comment-${root.id}`}
                      >
                        {/* ROOT Comment or Structural Placeholder */}
                        {isDeletedRoot ? (
                          <div className={styles.tombstoneRoot}>
                            <span className={styles.tombstoneText}>
                              {t("post.deletedComment")}
                            </span>
                          </div>
                        ) : (
                          <CommentItem
                            post={post}
                            comment={root}
                            isSelected={isRootSelected}
                            isHighlighted={isRootHighlighted}
                            isMenuOpen={openCommentMenuId === root.id}
                            onToggleMenu={() =>
                              setOpenCommentMenuId((prev) =>
                                prev === root.id ? null : root.id,
                              )
                            }
                            onCloseMenu={() => setOpenCommentMenuId(null)}
                            onClose={onClose}
                            onReply={() => handleStartReply(root, root.id)}
                            onAccept={() => {
                              void acceptAnswer({
                                postId: post.id,
                                commentId: post.acceptedAnswerId === root.id ? null : root.id,
                              }).catch(() => {
                                setCommentError(
                                  t("post.acceptError"),
                                );
                              });
                            }}
                            onDelete={() => handleDeleteComment(root.id)}
                            mentionEntities={effectiveMentionEntities}
                          />
                        )}

                        {/* REPLIES for this ROOT (One-Level Deep) */}
                        {replies.length > 0 ? (
                          <div className={styles.threadReplies}>
                            {replies.map((reply) => {
                              const isReplySelected =
                                activeReplyTarget?.commentId === reply.id;
                              const isReplyHighlighted =
                                highlightedCommentId === reply.id;
                              const directTarget = reply.replyToCommentId
                                ? commentsById.get(reply.replyToCommentId)
                                : undefined;

                              return (
                                <div
                                  key={reply.id}
                                  className={styles.threadReplyWrapper}
                                  id={`comment-${reply.id}`}
                                >
                                  <CommentItem
                                    post={post}
                                    comment={reply}
                                    isReply={true}
                                    isSelected={isReplySelected}
                                    isHighlighted={isReplyHighlighted}
                                    isMenuOpen={openCommentMenuId === reply.id}
                                    onToggleMenu={() =>
                                      setOpenCommentMenuId((prev) =>
                                        prev === reply.id ? null : reply.id,
                                      )
                                    }
                                    onCloseMenu={() =>
                                      setOpenCommentMenuId(null)
                                    }
                                    targetAuthor={
                                      directTarget &&
                                      directTarget.id !== root.id
                                        ? directTarget.author
                                        : undefined
                                    }
                                    onClose={onClose}
                                    onReply={() =>
                                      handleStartReply(reply, root.id)
                                    }
                                    onDelete={() =>
                                      handleDeleteComment(reply.id)
                                    }
                                    mentionEntities={effectiveMentionEntities}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky Composer */}
            <div ref={composerRef} className={styles.stickyReplyWrap}>
              {/* Sibling 1: Compact Reply Context Preview (rendered above composer row) */}
              {activeReplyTarget ? (
                <div className={styles.replyContextPreview}>
                  <div className={styles.replyContextHead}>
                    <span className={styles.replyContextAuthor}>
                      <IconReply
                        width={12}
                        height={12}
                        className={styles.replyContextIcon}
                      />
                      <span>{activeReplyTarget.author.name}</span>
                    </span>
                    <button
                      type="button"
                      className={styles.cancelReplyBtn}
                      onClick={handleCancelReplyTarget}
                      aria-label={t("post.cancelReply")}
                      title={t("post.cancelReply")}
                    >
                      <IconClose width={12} height={12} />
                    </button>
                  </div>
                  <div className={styles.replyContextExcerpt}>
                    {activeReplyTarget.content}
                  </div>
                </div>
              ) : null}

              {/* Sibling 2: Composer Row (Avatar Gutter + Editor Surface) */}
              <div className={styles.composerRow}>
                {/* Fixed Avatar Gutter */}
                <div className={styles.composerGutter}>
                  <div className={styles.replyAvatar}>
                    {userProfile?.avatarUrl || userProfile?.avatar ? (
                      <img
                        src={userProfile.avatarUrl || userProfile.avatar}
                    alt={userProfile.displayName || t("common.user")}
                        className={styles.avatarImg}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span>{currentUserInitials}</span>
                    )}
                  </div>
                </div>

                {/* Single Unified Composer Surface */}
                <div className={styles.composerSurface}>
                  {/* Multiline Auto-Grow Textarea */}
                  <textarea
                    ref={replyTextareaRef}
                    rows={1}
                    className={styles.replyTextarea}
                    value={replyText}
                    placeholder={t("post.replyPlaceholder")}
                    disabled={isMutating}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    aria-label={t("post.replyLabel")}
                  />

                  {/* Attachment Slot (for future media) */}
                  <div className={styles.attachmentSlot} />

                  {/* Toolbar */}
                  <div className={styles.composerToolbar}>
                    <div className={styles.toolbarLeft}>
                      <button
                        type="button"
                        className={styles.toolBtn}
                        title={t("post.attachSoon")}
                        aria-label={t("post.attach")}
                        disabled
                      >
                        <IconPlus width={14} height={14} />
                      </button>
                    </div>
                    <div className={styles.toolbarRight}>
                      <button
                        type="button"
                        className={styles.sendBtn}
                        disabled={isMutating || !replyText.trim()}
                        onClick={() => handleSubmitReply()}
                        title={t("post.sendReply")}
                        aria-label={t("post.sendReply")}
                      >
                        <IconSend width={14} height={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CommentItemProps {
  post: Post;
  comment: PostComment;
  isReply?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  targetAuthor?: ChatAuthor;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onClose: () => void;
  onReply: () => void;
  onAccept?: () => void;
  onDelete: () => void;
  mentionEntities: EntityRef[];
}

function CommentItem({
  post,
  comment,
  isReply = false,
  isSelected = false,
  isHighlighted = false,
  targetAuthor,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onClose,
  onReply,
  onAccept,
  onDelete,
  mentionEntities,
}: CommentItemProps) {
  const { language, t } = useI18n();
  const { openProfile, userProfile, savedItems, toggleSavedTarget } = useHub();
  const menuRef = useRef<HTMLDivElement>(null);

  const accepted = post.acceptedAnswerId === comment.id;
  const isCommentSaved = isSaved(savedItems, "comment", comment.id);

  const isOwnComment =
    Boolean(
      userProfile?.username && comment.author.handle === userProfile.username,
    ) ||
    Boolean(userProfile?.id && comment.author.id === userProfile.id);
  const canManageAcceptedAnswer =
    post.type === "question" &&
    Boolean(userProfile?.id && post.author.id === userProfile.id);

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleDocClick = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMenu();
      }
    };

    document.addEventListener("click", handleDocClick);
    return () => {
      document.removeEventListener("click", handleDocClick);
    };
  }, [isMenuOpen, onCloseMenu]);

  const handleCopyText = (e: MouseEvent) => {
    e.stopPropagation();
    onCloseMenu();
    if (navigator.clipboard && !comment.deletedAt) {
      navigator.clipboard.writeText(comment.content);
    }
  };

  const handleCopyLink = (e: MouseEvent) => {
    e.stopPropagation();
    onCloseMenu();
    if (navigator.clipboard) {
      const url = `${window.location.origin}/posts/${post.id}?comment=${comment.id}`;
      navigator.clipboard.writeText(url);
    }
  };

  const handleToggleSave = (e: MouseEvent) => {
    e.stopPropagation();
    onCloseMenu();
    toggleSavedTarget(describeComment(comment, post));
  };

  const handleMenuReply = (e: MouseEvent) => {
    e.stopPropagation();
    onCloseMenu();
    onReply();
  };

  const handleMenuAccept = (e: MouseEvent) => {
    e.stopPropagation();
    onCloseMenu();
    onAccept?.();
  };

  const handleMenuDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onCloseMenu();
    onDelete();
  };

  if (comment.deletedAt) {
    return null;
  }

  return (
    <article
      className={`${styles.commentItem} ${
        isReply ? styles.commentItemReply : ""
      } ${isSelected ? styles.commentItemSelected : ""} ${
        isHighlighted ? styles.commentItemHighlighted : ""
      }`}
    >
      {/* Head */}
      <div className={styles.commentItemHead}>
        <div className={styles.commentAuthorGroup}>
          <ProfileHoverCard
            identifier={comment.author.handle || comment.author.id}
            initialAuthor={comment.author}
            onOpenProfile={() => {
              onClose();
              openProfile(comment.author.handle || comment.author.id);
            }}
          >
            <div
              className={`${styles.commentAvatar} ${
                isReply ? styles.commentAvatarReply : ""
              }`}
            >
              {comment.author.avatarUrl ? (
                <img
                  src={comment.author.avatarUrl}
                  alt={comment.author.name}
                  className={styles.avatarImg}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span>
                  {comment.author.initials ||
                    profileService.getInitials(
                      comment.author.name,
                      comment.author.handle,
                    )}
                </span>
              )}
            </div>
          </ProfileHoverCard>
          <div className={styles.commentAuthorMeta}>
            <ProfileHoverCard
              identifier={comment.author.handle || comment.author.id}
              initialAuthor={comment.author}
              onOpenProfile={() => {
                onClose();
                openProfile(comment.author.handle || comment.author.id);
              }}
            >
              <button
                type="button"
                className={styles.commentAuthorBtn}
                onClick={() => {
                  onClose();
                  openProfile(comment.author.handle || comment.author.id);
                }}
              >
                {comment.author.name}
              </button>
            </ProfileHoverCard>
            <span className={styles.dot}>·</span>
            <span className={styles.date}>
              {formatDateTime(comment.createdAt, language === "ru" ? "ru-RU" : "en-US")}
            </span>
            {accepted ? (
              <span className={styles.solvedBadge}>✓ {t("post.solution")}</span>
            ) : null}
          </div>
        </div>

        {/* Action icons: Reply Icon Button + More Menu */}
        <div className={styles.commentActions}>
          <IconButton
            label={t("post.reply")}
            title={t("post.reply")}
            active={isSelected}
            className={styles.replyIconBtn}
            onClick={onReply}
          >
            <IconReply width={14} height={14} />
          </IconButton>

          <div
            ref={menuRef}
            className={styles.commentMenuWrap}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              label={t("post.commentOptions")}
              title={isMenuOpen ? "" : t("post.commentOptions")}
              onClick={onToggleMenu}
            >
              <IconMore width={15} height={15} />
            </IconButton>

            {isMenuOpen ? (
              <div className={styles.commentMenuDropdown} role="menu">
                <button
                  type="button"
                  className={styles.commentMenuItem}
                  role="menuitem"
                  onClick={handleMenuReply}
                >
                  {t("post.reply")}
                </button>
                <button
                  type="button"
                  className={styles.commentMenuItem}
                  role="menuitem"
                  onClick={handleCopyLink}
                >
                  {t("post.copyLink")}
                </button>
                <button
                  type="button"
                  className={styles.commentMenuItem}
                  role="menuitem"
                  onClick={handleCopyText}
                >
                  {t("post.copyText")}
                </button>
                <button
                  type="button"
                  className={styles.commentMenuItem}
                  role="menuitem"
                  onClick={handleToggleSave}
                >
                  {isCommentSaved ? t("saved.removeBookmark") : t("common.save")}
                </button>
                {canManageAcceptedAnswer && onAccept ? (
                  <button
                    type="button"
                    className={styles.commentMenuItem}
                    role="menuitem"
                    onClick={handleMenuAccept}
                  >
                    {accepted ? t("post.unmarkSolution") : t("post.markSolution")}
                  </button>
                ) : null}
                {isOwnComment ? (
                  <button
                    type="button"
                    className={`${styles.commentMenuItem} ${styles.commentMenuItemDanger}`}
                    role="menuitem"
                    onClick={handleMenuDelete}
                  >
                    {t("common.delete")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Rendered Reply-To Metadata (for reply-to-reply in thread) */}
      {targetAuthor ? (
        <div
          className={`${styles.replyToMeta} ${
            isReply ? styles.replyToMetaReply : ""
          }`}
        >
          <IconReply width={11} height={11} className={styles.replyToIcon} />
          <span className={styles.replyToLabel}>{t("post.inReply")}</span>
          <ProfileHoverCard
            identifier={targetAuthor.handle || targetAuthor.id}
            initialAuthor={targetAuthor}
            onOpenProfile={() => {
              onClose();
              openProfile(targetAuthor.handle || targetAuthor.id);
            }}
          >
            <button
              type="button"
              className={styles.replyToAuthorBtn}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                openProfile(targetAuthor.handle || targetAuthor.id);
              }}
            >
              {targetAuthor.name}
            </button>
          </ProfileHoverCard>
        </div>
      ) : null}

      {/* Body */}
      <div
        className={`${styles.commentItemBody} ${
          isReply ? styles.commentItemBodyReply : ""
        }`}
      >
        <RichText text={comment.content} entities={mentionEntities} />
      </div>
    </article>
  );
}
