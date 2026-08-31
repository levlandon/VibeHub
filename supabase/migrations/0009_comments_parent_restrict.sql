-- Migration: 0009_comments_parent_restrict.sql
-- Replace ON DELETE CASCADE on parent_comment_id FK with ON DELETE RESTRICT to prevent accidental cascade deletion of threads.

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'comments'
    AND kcu.column_name = 'parent_comment_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.comments DROP CONSTRAINT ' || pg_catalog.quote_ident(fk_name);
  END IF;
END $$;

ALTER TABLE public.comments
  ADD CONSTRAINT fk_comments_parent_comment_id
  FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE RESTRICT;
