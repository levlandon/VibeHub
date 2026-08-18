-- Migration: 0001_profiles_posts_comments.sql
-- Wave 1 foundation: profiles, posts, comments with RLS.

-- Public user profile, mirrored from auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  handle text NOT NULL UNIQUE,
  initials text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Community posts: discussions, questions, projects, guides, resources.
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('discussion', 'question', 'project', 'guide', 'resource')),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tags text[] NOT NULL DEFAULT '{}',
  related_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  reactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  solved boolean NOT NULL DEFAULT false,
  accepted_answer_id uuid
);

-- Comments on posts.
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes requested in Wave 1.
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);

-- Ensure profile deletion cascades to content even on pre-existing FK constraints.
DO $$
BEGIN
  ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
END $$;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

DO $$
BEGIN
  ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;
END $$;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure accepted_answer_id references a comment and is cleared on comment deletion.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'fk_posts_accepted_answer'
      AND table_name = 'posts'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT fk_posts_accepted_answer
      FOREIGN KEY (accepted_answer_id) REFERENCES public.comments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Trigger helper: keep updated_at current on every UPDATE.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger helper: create a public profile when a new auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  raw_meta jsonb := NEW.raw_user_meta_data;
  user_name text;
  user_handle text;
  user_initials text;
BEGIN
  -- Prefer explicit name, then full_name, then email; never store an empty string.
  user_name := pg_catalog.left(
    pg_catalog.coalesce(
      pg_catalog.nullif(pg_catalog.trim(raw_meta ->> 'name'), ''),
      pg_catalog.nullif(pg_catalog.trim(raw_meta ->> 'full_name'), ''),
      pg_catalog.nullif(pg_catalog.trim(NEW.email), ''),
      'Anonymous'
    ),
    100
  );

  -- Build initials from the chosen name, capped at 3 characters.
  user_initials := pg_catalog.left(
    pg_catalog.coalesce(
      pg_catalog.nullif(pg_catalog.trim(raw_meta ->> 'initials'), ''),
      pg_catalog.nullif((
        SELECT pg_catalog.upper(pg_catalog.string_agg(pg_catalog.left(word, 1), ''))
        FROM pg_catalog.unnest(pg_catalog.string_to_array(user_name, ' ')) AS word
        WHERE pg_catalog.length(word) > 0
      ), ''),
      '?'
    ),
    3
  );

  -- Accept only safe handles: 3-30 lowercase alphanumerics/underscores.
  user_handle := pg_catalog.lower(
    pg_catalog.regexp_replace(
      pg_catalog.nullif(pg_catalog.trim(raw_meta ->> 'handle'), ''),
      '\s+',
      '_',
      'g'
    )
  );

  IF user_handle IS NULL OR user_handle !~ '^[a-z0-9_]{3,30}$' THEN
    user_handle := 'user_' || pg_catalog.substr(pg_catalog.replace(NEW.id::text, '-', ''), 1, 25);
  END IF;

  -- Avoid unique-violation crashes if the chosen handle is already taken.
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.handle = user_handle) LOOP
    user_handle := 'user_' || pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 25);
  END LOOP;

  INSERT INTO public.profiles (id, name, handle, initials)
  VALUES (NEW.id, user_name, user_handle, user_initials);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger helper: an accepted answer must belong to the same post.
CREATE OR REPLACE FUNCTION public.validate_accepted_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.accepted_answer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.comments
      WHERE public.comments.id = NEW.accepted_answer_id
        AND public.comments.post_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'accepted_answer_id must reference a comment on the same post';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_accepted_answer_trigger ON public.posts;
CREATE TRIGGER validate_accepted_answer_trigger
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_accepted_answer();

-- Restrict direct execution of trigger-only functions.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_accepted_answer() FROM PUBLIC, anon, authenticated;

-- Row Level Security.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Profiles: public read; owners can write their own row.
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- Posts: public read; authenticated owners can insert/update/delete.
DROP POLICY IF EXISTS "Posts are publicly viewable" ON public.posts;
CREATE POLICY "Posts are publicly viewable" ON public.posts
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own posts" ON public.posts;
CREATE POLICY "Users can insert own posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Comments: public read; authenticated owners can insert/update/delete.
DROP POLICY IF EXISTS "Comments are publicly viewable" ON public.comments;
CREATE POLICY "Comments are publicly viewable" ON public.comments
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
CREATE POLICY "Users can insert own comments" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);
