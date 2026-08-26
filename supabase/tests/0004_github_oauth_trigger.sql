BEGIN;
SELECT plan(10);

-- 1. Test handle_new_user trigger function exists
SELECT has_function('public', 'handle_new_user', 'public.handle_new_user() function should exist');

-- 2. Test GitHub OAuth user creation with user_name, full_name, avatar_url
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '44444444-4444-4444-a444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'octocat@github.com',
  'secret',
  '{"user_name":"octo-coder","full_name":"Octo Coder","avatar_url":"https://avatars.githubusercontent.com/u/999?v=4"}'::jsonb,
  now(),
  now()
);

SELECT results_eq(
  $$SELECT name, handle, initials, avatar_url FROM public.profiles WHERE id = '44444444-4444-4444-a444-444444444444'$$,
  $$VALUES ('Octo Coder', 'octo_coder', 'OC', 'https://avatars.githubusercontent.com/u/999?v=4')$$,
  'GitHub OAuth user gets clean name, sanitized handle, initials, and avatar'
);

-- 3. Test handle collision: creating a user with handle 'alex_dev' (which is already taken by Alex in seed)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '55555555-5555-5555-a555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'alex.another@example.com',
  'secret',
  '{"user_name":"alex_dev","name":"Alex Another"}'::jsonb,
  now(),
  now()
);

SELECT results_eq(
  $$SELECT handle FROM public.profiles WHERE id = '55555555-5555-5555-a555-555555555555'$$,
  $$VALUES ('alex_dev_2')$$,
  'Collision on alex_dev deterministically produces alex_dev_2'
);

-- 4. Test second collision: another user with 'alex_dev'
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '66666666-6666-6666-a666-666666666666',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'alex.third@example.com',
  'secret',
  '{"user_name":"alex_dev","name":"Alex Third"}'::jsonb,
  now(),
  now()
);

SELECT results_eq(
  $$SELECT handle FROM public.profiles WHERE id = '66666666-6666-6666-a666-666666666666'$$,
  $$VALUES ('alex_dev_3')$$,
  'Second collision on alex_dev deterministically produces alex_dev_3'
);

-- 5. Test fallback with completely empty metadata (only email)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '77777777-7777-7777-a777-777777777777',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'no-meta@example.com',
  'secret',
  '{}'::jsonb,
  now(),
  now()
);

SELECT results_eq(
  $$SELECT name, handle FROM public.profiles WHERE id = '77777777-7777-7777-a777-777777777777'$$,
  $$VALUES ('no-meta', 'no_meta')$$,
  'User with empty metadata falls back gracefully to email prefix'
);

-- 6. Test short handle padding (handle < 3 chars)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '88888888-8888-8888-a888-888888888888',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'x@example.com',
  'secret',
  '{"user_name":"x"}'::jsonb,
  now(),
  now()
);

SELECT is(
  (SELECT length(handle) >= 3 FROM public.profiles WHERE id = '88888888-8888-8888-a888-888888888888'),
  true,
  'Short handle padded to at least 3 characters'
);

-- 7. Test user profile persistence: user edits profile, repeat trigger execution does not overwrite
UPDATE public.profiles
SET bio = 'Edited bio by user',
    model_ids = ARRAY['openai/gpt-4o'],
    interests = ARRAY['Design']
WHERE id = '44444444-4444-4444-a444-444444444444';

-- Verify updated values
SELECT results_eq(
  $$SELECT bio, model_ids, interests FROM public.profiles WHERE id = '44444444-4444-4444-a444-444444444444'$$,
  $$VALUES ('Edited bio by user', ARRAY['openai/gpt-4o'], ARRAY['Design'])$$,
  'User edits are persisted in public.profiles'
);

-- 8. Existing seed user profiles remain intact
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id IN ('11111111-1111-4111-a111-111111111111', '22222222-2222-4222-a222-222222222222')),
  2::bigint,
  'Seed profiles remain intact'
);

-- 9. Check RLS policies on profiles remain active
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
  true,
  'public.profiles has RLS enabled'
);

-- 10. Check non-leakage: unauthenticated cannot modify profiles
SET ROLE anon;
SELECT throws_ok(
  $$UPDATE public.profiles SET name = 'Hacked' WHERE id = '44444444-4444-4444-a444-444444444444'$$,
  '42501',
  NULL,
  'Anon cannot update profiles'
);

ROLLBACK;
