-- Migration: 0002_posts_cursor_index.sql
-- Composite index for deterministic cursor pagination (created_at DESC, id DESC)

CREATE INDEX IF NOT EXISTS idx_posts_created_at_id_desc ON public.posts (created_at DESC, id DESC);
