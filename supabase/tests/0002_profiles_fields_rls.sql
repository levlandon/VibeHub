BEGIN;
SELECT plan(13);

-- 1. Check columns exist on public.profiles
SELECT has_column('public', 'profiles', 'bio', 'public.profiles should have bio column');
SELECT has_column('public', 'profiles', 'avatar_url', 'public.profiles should have avatar_url column');
SELECT has_column('public', 'profiles', 'model_ids', 'public.profiles should have model_ids column');
SELECT has_column('public', 'profiles', 'interests', 'public.profiles should have interests column');

-- 2. Test CHECK constraints on public.profiles
SELECT throws_ok(
  $$UPDATE public.profiles SET bio = repeat('x', 161) WHERE id = '11111111-1111-4111-a111-111111111111'$$,
  '23514',
  NULL,
  'bio exceeding 160 characters violates check constraint'
);

SELECT throws_ok(
  $$UPDATE public.profiles SET model_ids = ARRAY['1','2','3','4','5','6','7','8','9'] WHERE id = '11111111-1111-4111-a111-111111111111'$$,
  '23514',
  NULL,
  'model_ids exceeding 8 elements violates check constraint'
);

SELECT throws_ok(
  $$UPDATE public.profiles SET interests = ARRAY['1','2','3','4','5','6','7'] WHERE id = '11111111-1111-4111-a111-111111111111'$$,
  '23514',
  NULL,
  'interests exceeding 6 elements violates check constraint'
);

-- 3. Test anon permissions on new profile columns
SET ROLE anon;

SELECT lives_ok(
  $$SELECT id, name, handle, initials, bio, avatar_url, model_ids, interests FROM public.profiles$$,
  'anon can select all public profile columns'
);

SELECT throws_ok(
  $$UPDATE public.profiles SET bio = 'Hacked Bio' WHERE id = '11111111-1111-4111-a111-111111111111'$$,
  '42501',
  NULL,
  'anon cannot update profiles'
);

-- 4. Test authenticated permissions and owner RLS checks
SET ROLE authenticated;

-- Set user session to user 1
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-a111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-a111-111111111111"}', true);

-- User 1 can update their own profile fields
SELECT lives_ok(
  $$UPDATE public.profiles
    SET bio = 'Updated bio by User 1',
        avatar_url = 'https://example.com/new-avatar.png',
        model_ids = ARRAY['anthropic/claude-3.7-sonnet'],
        interests = ARRAY['Coding', 'Research']
    WHERE id = '11111111-1111-4111-a111-111111111111'$$,
  'authenticated user can update their own profile fields'
);

-- Verify updated values
SELECT is(
  (SELECT bio FROM public.profiles WHERE id = '11111111-1111-4111-a111-111111111111'),
  'Updated bio by User 1',
  'bio was successfully updated'
);

-- User 1 cannot update user 2's profile fields
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  UPDATE public.profiles
  SET bio = 'Hacked bio by User 1',
      avatar_url = 'https://example.com/hacked.png',
      model_ids = ARRAY['hacked/model'],
      interests = ARRAY['Hacking']
  WHERE id = '22222222-2222-4222-a222-222222222222';

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to update another users profile fields';
  END IF;
END $$;
SELECT pass('authenticated user cannot update another user profile fields');

-- Verify User 2's profile is untouched
SELECT is(
  (SELECT bio FROM public.profiles WHERE id = '22222222-2222-4222-a222-222222222222'),
  'AI Researcher. Изучаю reasoning models, MCP и мультиагентные пайплайны.',
  'User 2 bio remains untouched'
);

SELECT * FROM finish();
ROLLBACK;
