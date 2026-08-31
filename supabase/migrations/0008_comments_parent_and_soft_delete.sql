-- Migration: 0008_comments_parent_and_soft_delete.sql
-- 1. Add parent_comment_id for one-level comment threading with CASCADE on hard-delete.
-- 2. Add deleted_at for soft deletion to preserve thread structure and replies.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments (deleted_at);
