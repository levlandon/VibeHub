import type { Post, PostComment } from "../../types/posts";

export interface PostsRepository {
  getPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  getComments(postId: string): Promise<PostComment[]>;
}
