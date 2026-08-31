-- Closed-beta stabilization: discussion invariants, privacy, input limits, and basic abuse controls.

CREATE OR REPLACE FUNCTION public.validate_comment_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_row public.comments%ROWTYPE;
  reply_row public.comments%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'deleted comments are immutable';
  END IF;

  IF NEW.parent_comment_id = NEW.id OR NEW.reply_to_comment_id = NEW.id THEN
    RAISE EXCEPTION 'a comment cannot reference itself';
  END IF;

  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT * INTO parent_row FROM public.comments WHERE id = NEW.parent_comment_id;
    IF NOT FOUND OR parent_row.post_id <> NEW.post_id THEN
      RAISE EXCEPTION 'parent_comment_id must reference a comment on the same post';
    END IF;
    IF parent_row.parent_comment_id IS NOT NULL THEN
      RAISE EXCEPTION 'parent_comment_id must reference a root comment';
    END IF;
  END IF;

  IF NEW.reply_to_comment_id IS NOT NULL THEN
    SELECT * INTO reply_row FROM public.comments WHERE id = NEW.reply_to_comment_id;
    IF NOT FOUND OR reply_row.post_id <> NEW.post_id THEN
      RAISE EXCEPTION 'reply_to_comment_id must reference a comment on the same post';
    END IF;
    IF NEW.parent_comment_id IS NULL THEN
      RAISE EXCEPTION 'reply_to_comment_id requires parent_comment_id';
    END IF;
    IF reply_row.id <> NEW.parent_comment_id
       AND reply_row.parent_comment_id IS DISTINCT FROM NEW.parent_comment_id THEN
      RAISE EXCEPTION 'reply target must belong to the same root thread';
    END IF;
  END IF;

  IF NEW.deleted_at IS NOT NULL THEN
    NEW.content := '';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_comment_parent_same_post_trigger ON public.comments;
DROP TRIGGER IF EXISTS validate_comment_thread_trigger ON public.comments;
CREATE TRIGGER validate_comment_thread_trigger
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_comment_thread();

REVOKE EXECUTE ON FUNCTION public.validate_comment_thread() FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.validate_comment_parent_same_post();

CREATE OR REPLACE FUNCTION public.validate_accepted_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (NEW.accepted_answer_id IS NULL) <> (NOT NEW.solved) THEN
    RAISE EXCEPTION 'solved and accepted_answer_id must be consistent';
  END IF;
  IF NEW.accepted_answer_id IS NOT NULL THEN
    IF NEW.type <> 'question' THEN
      RAISE EXCEPTION 'only question posts can have an accepted answer';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.comments
      WHERE id = NEW.accepted_answer_id
        AND post_id = NEW.id
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'accepted answer must be an active comment on the same post';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_deleted_accepted_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE public.posts
      SET accepted_answer_id = NULL, solved = false
      WHERE accepted_answer_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_deleted_accepted_answer_trigger ON public.comments;
CREATE TRIGGER clear_deleted_accepted_answer_trigger
  AFTER UPDATE OF deleted_at ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.clear_deleted_accepted_answer();
REVOKE EXECUTE ON FUNCTION public.clear_deleted_accepted_answer() FROM PUBLIC, anon, authenticated;

-- Soft-delete is the sole authenticated deletion contract.
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
REVOKE DELETE ON public.comments FROM authenticated;

-- Profiles are auth-owned identities and cannot be removed through the public REST table.
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
REVOKE DELETE ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.text_array_items_within(values_to_check text[], max_length int)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
  SELECT pg_catalog.bool_and(
    pg_catalog.length(pg_catalog.btrim(item)) BETWEEN 1 AND max_length
  ) FROM pg_catalog.unnest(values_to_check) AS item;
$$;
-- CHECK constraints invoke this immutable helper as the current role.
-- Keep execution available while the function itself has no data access or side effects.
GRANT EXECUTE ON FUNCTION public.text_array_items_within(text[], int) TO PUBLIC;

-- Make anonymous access explicitly read-only on public tables and deny private tables.
REVOKE INSERT, UPDATE, DELETE ON public.profiles, public.posts, public.comments FROM anon;
REVOKE ALL ON public.saved_items, public.collections, public.collection_items FROM anon;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_title_length_check CHECK (pg_catalog.length(pg_catalog.btrim(title)) BETWEEN 1 AND 200),
  ADD CONSTRAINT posts_content_length_check CHECK (pg_catalog.length(pg_catalog.btrim(content)) BETWEEN 1 AND 50000),
  ADD CONSTRAINT posts_tags_count_check CHECK (cardinality(tags) <= 20),
  ADD CONSTRAINT posts_tags_item_length_check CHECK (public.text_array_items_within(tags, 50)),
  ADD CONSTRAINT posts_related_entities_size_check CHECK (pg_catalog.octet_length(related_entities::text) <= 65536),
  ADD CONSTRAINT posts_extras_size_check CHECK (pg_catalog.octet_length(extras::text) <= 65536);

ALTER TABLE public.comments
  ADD CONSTRAINT comments_content_length_check CHECK (
    deleted_at IS NOT NULL OR pg_catalog.length(pg_catalog.btrim(content)) BETWEEN 1 AND 10000
  );

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_name_length_check CHECK (pg_catalog.length(pg_catalog.btrim(name)) BETWEEN 1 AND 50),
  ADD CONSTRAINT profiles_handle_length_check CHECK (pg_catalog.length(handle) BETWEEN 2 AND 30),
  ADD CONSTRAINT profiles_initials_length_check CHECK (pg_catalog.length(pg_catalog.btrim(initials)) BETWEEN 1 AND 8),
  ADD CONSTRAINT profiles_avatar_url_length_check CHECK (pg_catalog.length(avatar_url) <= 2000),
  ADD CONSTRAINT profiles_model_ids_item_length_check CHECK (public.text_array_items_within(model_ids, 200)),
  ADD CONSTRAINT profiles_interests_item_length_check CHECK (public.text_array_items_within(interests, 80));

ALTER TABLE public.collection_items
  ADD CONSTRAINT collection_items_favicon_length_check CHECK (pg_catalog.length(favicon) <= 2000);

-- Lightweight per-user write ceilings. These protect direct REST writes without a new service.
CREATE OR REPLACE FUNCTION public.enforce_beta_write_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recent_count bigint;
  ceiling int;
BEGIN
  IF auth.uid() IS NULL OR NEW.author_id <> auth.uid() THEN
    RETURN NEW;
  END IF;
  ceiling := CASE TG_TABLE_NAME WHEN 'posts' THEN 5 ELSE 20 END;
  IF TG_TABLE_NAME = 'posts' THEN
    SELECT count(*) INTO recent_count FROM public.posts
      WHERE author_id = auth.uid() AND created_at > now() - interval '1 minute';
  ELSE
    SELECT count(*) INTO recent_count FROM public.comments
      WHERE author_id = auth.uid() AND created_at > now() - interval '1 minute';
  END IF;
  IF recent_count >= ceiling THEN
    RAISE EXCEPTION 'write rate limit exceeded';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_beta_write_rate_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER posts_beta_write_rate_limit
  BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.enforce_beta_write_rate_limit();
CREATE TRIGGER comments_beta_write_rate_limit
  BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.enforce_beta_write_rate_limit();
