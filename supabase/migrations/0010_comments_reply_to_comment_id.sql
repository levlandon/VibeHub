-- Migration: 0010_comments_reply_to_comment_id.sql
-- Add reply_to_comment_id to track the direct target comment of a reply
-- while parent_comment_id maintains root thread grouping.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reply_to_comment_id uuid REFERENCES public.comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_comments_reply_to_comment_id ON public.comments (reply_to_comment_id);
