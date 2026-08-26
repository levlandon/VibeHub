import type { Post, PostComment } from "../../types/posts";

export interface PostsCursor {
  createdAt: string;
  id: string;
}

export interface PostsPage {
  posts: Post[];
  nextCursor: PostsCursor | null;
}

export interface PostsRepository {
  getPosts(cursor?: PostsCursor, limit?: number): Promise<PostsPage>;
  getPost(id: string): Promise<Post | null>;
  getComments(postId: string): Promise<PostComment[]>;
}
