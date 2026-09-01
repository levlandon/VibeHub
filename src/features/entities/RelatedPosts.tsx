import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PostCard } from "../community/PostCard";
import type { Post } from "../../types/posts";
import { useI18n } from "../../i18n";

export function RelatedPosts({ posts }: { posts: Post[] }) {
  const { t } = useI18n();
  if (!posts.length) {
    return <EmptyState>{t("entity.noRelated")}</EmptyState>;
  }
  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
