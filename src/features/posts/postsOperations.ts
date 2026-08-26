import {
  acceptAnswer as acceptAnswerOn,
  addComment as addCommentOn,
  createPost,
  deletePost as deletePostOn,
  updatePost as updatePostOn,
} from "../../services/posts";
import type { Post } from "../../types/posts";

/**
 * Appends new posts to existing posts, deduplicating by ID.
 */
export function mergePostsDeduplicated(
  existing: readonly Post[],
  incoming: readonly Post[],
): Post[] {
  const existingIds = new Set(existing.map((p) => p.id));
  const uniqueIncoming = incoming.filter((p) => !existingIds.has(p.id));
  return [...existing, ...uniqueIncoming];
}

export {
  createPost,
  updatePostOn as updatePost,
  deletePostOn as deletePost,
  addCommentOn as addComment,
  acceptAnswerOn as acceptAnswer,
};
