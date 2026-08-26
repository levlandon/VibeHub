-- Migration: 0007_handle_new_user_github_oauth.sql
-- Defensive GitHub OAuth metadata extraction, deterministic handle collisions, and concurrent race protection

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
  base_handle text;
  user_initials text;
  user_avatar text;
  counter integer := 2;
  attempt integer := 1;
BEGIN
  -- 1. Extract Display Name (Fallback: name/full_name -> user_name/login -> email prefix -> 'GitHub User')
  user_name := pg_catalog.left(
    COALESCE(
      NULLIF(pg_catalog.btrim(raw_meta ->> 'name'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'full_name'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'user_name'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'preferred_username'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'login'), ''),
      NULLIF(pg_catalog.split_part(NEW.email, '@', 1), ''),
      'GitHub User'
    ),
    100
  );

  -- 2. Extract Initials (1..3 uppercase letters)
  user_initials := pg_catalog.left(
    COALESCE(
      NULLIF(pg_catalog.btrim(raw_meta ->> 'initials'), ''),
      NULLIF((
        SELECT pg_catalog.upper(pg_catalog.string_agg(pg_catalog.left(word, 1), ''))
        FROM pg_catalog.unnest(pg_catalog.string_to_array(user_name, ' ')) AS word
        WHERE pg_catalog.length(word) > 0
      ), ''),
      'GH'
    ),
    3
  );

  -- 3. Extract Avatar URL
  user_avatar := pg_catalog.left(
    COALESCE(
      NULLIF(pg_catalog.btrim(raw_meta ->> 'avatar_url'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'avatarUrl'), ''),
      ''
    ),
    500
  );

  -- 4. Extract Base Handle candidate
  base_handle := pg_catalog.lower(
    COALESCE(
      NULLIF(pg_catalog.btrim(raw_meta ->> 'handle'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'user_name'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'preferred_username'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'login'), ''),
      NULLIF(pg_catalog.btrim(raw_meta ->> 'username'), ''),
      NULLIF(pg_catalog.split_part(NEW.email, '@', 1), ''),
      ''
    )
  );

  -- Sanitize base handle: replace spaces & hyphens with underscores, remove non-alphanumerics
  base_handle := pg_catalog.regexp_replace(base_handle, '[\s\-]+', '_', 'g');
  base_handle := pg_catalog.regexp_replace(base_handle, '[^a-z0-9_]', '', 'g');

  -- Ensure handle meets 3..30 char constraint
  IF pg_catalog.length(base_handle) < 3 THEN
    base_handle := 'user_' || pg_catalog.substr(pg_catalog.replace(NEW.id::text, '-', ''), 1, 8);
  ELSIF pg_catalog.length(base_handle) > 26 THEN
    base_handle := pg_catalog.left(base_handle, 26);
  END IF;

  user_handle := base_handle;

  -- 5. Deterministic collision resolution before insert
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.handle = user_handle AND public.profiles.id <> NEW.id) LOOP
    IF counter <= 99 THEN
      user_handle := pg_catalog.left(base_handle, 30 - pg_catalog.length('_' || counter::text)) || '_' || counter::text;
      counter := counter + 1;
    ELSE
      user_handle := pg_catalog.left(base_handle, 23) || '_' || pg_catalog.substr(pg_catalog.replace(NEW.id::text, '-', ''), 1, 6);
      EXIT;
    END IF;
  END LOOP;

  -- 6. Insert into profiles with exception handling for concurrent race conditions
  FOR attempt IN 1..5 LOOP
    BEGIN
      INSERT INTO public.profiles (id, name, handle, initials, avatar_url)
      VALUES (NEW.id, user_name, user_handle, user_initials, user_avatar)
      ON CONFLICT (id) DO NOTHING;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF counter <= 99 THEN
        user_handle := pg_catalog.left(base_handle, 30 - pg_catalog.length('_' || counter::text)) || '_' || counter::text;
        counter := counter + 1;
      ELSE
        user_handle := pg_catalog.left(base_handle, 23) || '_' || pg_catalog.substr(pg_catalog.replace(NEW.id::text, '-', ''), 1, 6);
      END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
