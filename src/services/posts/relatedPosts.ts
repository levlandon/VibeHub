import type { Post } from "../../types/posts";

/**
 * Deterministically ranks and returns related posts for a given post.
 * Ranking criteria:
 * 1. Shared related entities (models / tools) -> +10 points per shared entity.
 * 2. Same category -> +4 points.
 * 3. Same post type -> +2 points.
 * 4. Engagement (comments count + reactions count) -> up to +2.5 points.
 * 5. Recency -> up to +2 points.
 */
export function computeRelatedPosts(
  currentPost: Post,
  allPosts: Post[],
  limit = 3,
): Post[] {
  if (!currentPost || !allPosts || allPosts.length === 0) {
    return [];
  }

  const currentEntityIds = new Set(
    currentPost.relatedEntities?.map((e) => e.id) || [],
  );

  const scored = allPosts
    .filter((p) => p.id !== currentPost.id)
    .map((p) => {
      let score = 0;

      // 1. Shared related entities (models / tools)
      if (p.relatedEntities && p.relatedEntities.length > 0) {
        for (const e of p.relatedEntities) {
          if (currentEntityIds.has(e.id)) {
            score += 10;
          }
        }
      }

      // 2. Same category / type
      if (p.category && currentPost.category && p.category === currentPost.category) {
        score += 4;
      } else if (p.type === currentPost.type) {
        score += 2;
      }

      // If no base relevance (no shared entity, different category/type), do not recommend
      if (score === 0) {
        return { post: p, score: 0 };
      }

      // 3. Engagement bonus
      const commentsCount = p.comments?.length || 0;
      const reactionsCount =
        p.reactions?.reduce((acc, r) => acc + (r.count || 0), 0) || 0;
      score += Math.min(commentsCount + reactionsCount, 5) * 0.5;

      // 4. Recency bonus
      if (p.createdAt) {
        const ageHours =
          (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          score += 2;
        } else if (ageHours < 72) {
          score += 1;
        }
      }

      return { post: p, score };
    })
    .filter((item) => item.score > 2) // Must have at least shared entity or same category
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post);

  return scored;
}
