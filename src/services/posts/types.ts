import type { EntityRef } from "../../types/entities";
import type { CreatePostInput, Post, PostComment } from "../../types/posts";

export interface PostsCursor {
  createdAt: string;
  id: string;
}

export interface PostsPage {
  posts: Post[];
  nextCursor: PostsCursor | null;
}

export interface DeleteCommentInput {
  postId: string;
  commentId: string;
}

export interface AcceptAnswerInput {
  postId: string;
  commentId: string | null;
}

export interface PostsRepository {
  getPosts(cursor?: PostsCursor, limit?: number): Promise<PostsPage>;
  getPost(id: string): Promise<Post | null>;
  getComments(postId: string): Promise<PostComment[]>;
  createPost(input: CreatePostInput, entities?: EntityRef[]): Promise<Post>;
  updatePost(
    postId: string,
    input: Partial<CreatePostInput>,
    entities?: EntityRef[],
  ): Promise<Post>;
  deletePost(postId: string): Promise<void>;
  createComment(
    postId: string,
    content: string,
    parentCommentId?: string | null,
    replyToCommentId?: string | null,
  ): Promise<PostComment>;
  updateComment(commentId: string, content: string): Promise<PostComment>;
  deleteComment(input: DeleteCommentInput): Promise<PostComment>;
  acceptAnswer(input: AcceptAnswerInput): Promise<Post>;
}
