-- Fix handle_new_user function to use standard SQL constructs and pg_catalog functions
-- NULLIF and COALESCE are SQL language constructs (not pg_catalog functions).
-- btrim is the pg_catalog function for trimming.

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

  INSERT INTO public.profiles (id, name, handle, initials)
  VALUES (NEW.id, user_name, user_handle, user_initials);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
