-- Migration: 0011_validate_comment_parent_same_post.sql
-- Ensure parent_comment_id and reply_to_comment_id reference comments on the same post.

CREATE OR REPLACE FUNCTION public.validate_comment_parent_same_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.comments
      WHERE public.comments.id = NEW.parent_comment_id
        AND public.comments.post_id = NEW.post_id
    ) THEN
      RAISE EXCEPTION 'parent_comment_id must reference a comment on the same post';
    END IF;
  END IF;

  IF NEW.reply_to_comment_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.comments
      WHERE public.comments.id = NEW.reply_to_comment_id
        AND public.comments.post_id = NEW.post_id
    ) THEN
      RAISE EXCEPTION 'reply_to_comment_id must reference a comment on the same post';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_comment_parent_same_post_trigger ON public.comments;
CREATE TRIGGER validate_comment_parent_same_post_trigger
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_comment_parent_same_post();

REVOKE EXECUTE ON FUNCTION public.validate_comment_parent_same_post() FROM PUBLIC, anon, authenticated;
