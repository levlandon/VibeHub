-- Migration: 0005_profile_public_fields.sql
-- Add public profile fields (bio, avatar_url, model_ids, interests) to public.profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS model_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}';

-- Constraints for profile fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_bio_length_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_bio_length_check
      CHECK (pg_catalog.length(bio) <= 160);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_model_ids_max_items'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_model_ids_max_items
      CHECK (cardinality(model_ids) <= 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_interests_max_items'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_interests_max_items
      CHECK (cardinality(interests) <= 6);
  END IF;
END $$;

-- Update handle_new_user trigger function to optionally populate avatar_url from metadata
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
  user_avatar text;
BEGIN
  -- Prefer explicit name, then full_name, then email; never store an empty string.
  user_name := pg_catalog.left(
    COALESCE(
      NULLIF(pg_catalog.btrim(raw_meta ->> 'name'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'full_name'), ''),
      NULLIF(pg_catalog.btrim(NEW.email), ''),
      'Anonymous'
    ),
    100
  );

  -- Build initials from the chosen name, capped at 3 characters.
  user_initials := pg_catalog.left(
    COALESCE(
      NULLIF(pg_catalog.btrim(raw_meta ->> 'initials'), ''),
      NULLIF((
        SELECT pg_catalog.upper(pg_catalog.string_agg(pg_catalog.left(word, 1), ''))
        FROM pg_catalog.unnest(pg_catalog.string_to_array(user_name, ' ')) AS word
        WHERE pg_catalog.length(word) > 0
      ), ''),
      '?'
    ),
    3
  );

  -- Extract avatar URL if provided in user metadata
  user_avatar := pg_catalog.left(
    COALESCE(
      NULLIF(pg_catalog.btrim(raw_meta ->> 'avatar_url'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'avatarUrl'), ''),
      ''
    ),
    500
  );

  -- Accept only safe handles: 3-30 lowercase alphanumerics/underscores.
  user_handle := pg_catalog.lower(
    pg_catalog.regexp_replace(
      COALESCE(NULLIF(pg_catalog.btrim(raw_meta ->> 'handle'), ''), ''),
      '\s+',
      '_',
      'g'
    )
  );

  IF user_handle IS NULL OR user_handle = '' OR user_handle !~ '^[a-z0-9_]{3,30}$' THEN
    user_handle := 'user_' || pg_catalog.substr(pg_catalog.replace(NEW.id::text, '-', ''), 1, 25);
  END IF;

  -- Avoid unique-violation crashes if the chosen handle is already taken.
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.handle = user_handle) LOOP
    user_handle := 'user_' || pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 25);
  END LOOP;

  INSERT INTO public.profiles (id, name, handle, initials, avatar_url)
  VALUES (NEW.id, user_name, user_handle, user_initials, user_avatar);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
