import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PostCard } from "../community/PostCard";
import type { Post } from "../../types/posts";

export function RelatedPosts({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return <EmptyState>Пока нет связанных материалов.</EmptyState>;
  }
  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
