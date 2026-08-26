BEGIN;
SELECT plan(30);

-- 1. Check tables exist
SELECT has_table('public', 'saved_items', 'public.saved_items table should exist');
SELECT has_table('public', 'collections', 'public.collections table should exist');
SELECT has_table('public', 'collection_items', 'public.collection_items table should exist');

-- 2. Check RLS is enabled on all tables
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname = 'saved_items'), 'public.saved_items should have RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname = 'collections'), 'public.collections should have RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname = 'collection_items'), 'public.collection_items should have RLS enabled');

-- 3. Check constraints & uniqueness
SELECT throws_ok(
  $$INSERT INTO public.saved_items (user_id, entity_type, entity_id) VALUES ('11111111-1111-4111-a111-111111111111', 'invalid_type', 'test')$$,
  '23514',
  NULL,
  'invalid entity_type throws check constraint error'
);

SELECT throws_ok(
  $$INSERT INTO public.collections (user_id, name) VALUES ('11111111-1111-4111-a111-111111111111', '   ')$$,
  '23514',
  NULL,
  'blank collection name throws check constraint error'
);

SELECT throws_ok(
  $$INSERT INTO public.collection_items (collection_id, url) VALUES ('e0000001-0000-0000-0000-000000000001', '   ')$$,
  '23514',
  NULL,
  'blank collection item url throws check constraint error'
);

SELECT throws_ok(
  $$INSERT INTO public.saved_items (user_id, entity_type, entity_id) VALUES ('11111111-1111-4111-a111-111111111111', 'model', 'anthropic/claude-3.7-sonnet')$$,
  '23505',
  NULL,
  'duplicate saved item (user_id, entity_type, entity_id) throws unique constraint error'
);

SELECT throws_ok(
  $$INSERT INTO public.collection_items (collection_id, url) VALUES ('e0000001-0000-0000-0000-000000000001', 'https://openrouter.ai')$$,
  '23505',
  NULL,
  'duplicate collection item (collection_id, url) throws unique constraint error'
);

-- 4. Test anon permissions (no grants on private tables)
SET ROLE anon;

SELECT throws_ok(
  $$SELECT count(*) FROM public.saved_items$$,
  '42501',
  NULL,
  'anon cannot select saved_items'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.collections$$,
  '42501',
  NULL,
  'anon cannot select collections'
);

SELECT throws_ok(
  $$SELECT count(*) FROM public.collection_items$$,
  '42501',
  NULL,
  'anon cannot select collection_items'
);

SELECT throws_ok(
  $$INSERT INTO public.saved_items (user_id, entity_type, entity_id) VALUES ('11111111-1111-4111-a111-111111111111', 'model', 'test')$$,
  '42501',
  NULL,
  'anon cannot insert saved_items'
);

-- 5. Test authenticated permissions & RLS isolation
SET ROLE authenticated;

-- Set user session to User 1
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-a111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-a111-111111111111"}', true);

SELECT lives_ok(
  $$SELECT count(*) FROM public.saved_items$$,
  'authenticated user can select saved_items'
);

SELECT lives_ok(
  $$SELECT count(*) FROM public.collections$$,
  'authenticated user can select collections'
);

SELECT lives_ok(
  $$SELECT count(*) FROM public.collection_items$$,
  'authenticated user can select collection_items'
);

-- User 1 sees exactly 3 seed saved items
SELECT is(
  (SELECT count(*)::int FROM public.saved_items),
  3,
  'user 1 sees only own 3 saved items'
);

-- User 1 sees exactly 1 seed collection
SELECT is(
  (SELECT count(*)::int FROM public.collections),
  1,
  'user 1 sees only own 1 collection'
);

-- User 1 can insert own saved item
SELECT lives_ok(
  $$INSERT INTO public.saved_items (id, user_id, entity_type, entity_id, title) VALUES ('d0000001-0000-0000-0000-000000000099', '11111111-1111-4111-a111-111111111111', 'tool', 'new_tool', 'New Tool')$$,
  'user 1 can insert own saved item'
);

-- User 1 cannot insert saved item with User 2 user_id
SELECT throws_ok(
  $$INSERT INTO public.saved_items (user_id, entity_type, entity_id) VALUES ('22222222-2222-4222-a222-222222222222', 'tool', 'fake_tool')$$,
  '42501',
  NULL,
  'user 1 cannot insert saved item for user 2'
);

-- User 1 can insert own collection
SELECT lives_ok(
  $$INSERT INTO public.collections (id, user_id, name) VALUES ('e0000001-0000-0000-0000-000000000099', '11111111-1111-4111-a111-111111111111', 'User 1 New Collection')$$,
  'user 1 can insert own collection'
);

-- User 1 can insert item into own collection
SELECT lives_ok(
  $$INSERT INTO public.collection_items (collection_id, url, title) VALUES ('e0000001-0000-0000-0000-000000000099', 'https://example.com', 'Example')$$,
  'user 1 can insert item into own collection'
);

-- User 1 cannot insert item into User 2's collection
SELECT throws_ok(
  $$INSERT INTO public.collection_items (collection_id, url, title) VALUES ('e0000001-0000-0000-0000-000000000002', 'https://malicious.com', 'Malicious')$$,
  '42501',
  NULL,
  'user 1 cannot insert item into user 2 collection'
);

-- User 1 cannot update User 2's collection
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  UPDATE public.collections SET name = 'Hacked Collection' WHERE id = 'e0000001-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to update another users collection';
  END IF;
END $$;
SELECT pass('user 1 cannot update user 2 collection');

-- User 1 cannot delete User 2's saved item
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  DELETE FROM public.saved_items WHERE id = 'd0000001-0000-0000-0000-000000000004';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to delete another users saved item';
  END IF;
END $$;
SELECT pass('user 1 cannot delete user 2 saved item');

-- User 1 cannot delete User 2's collection
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  DELETE FROM public.collections WHERE id = 'e0000001-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to delete another users collection';
  END IF;
END $$;
SELECT pass('user 1 cannot delete user 2 collection');

-- User 1 can delete own collection, and its collection items are cascaded
SELECT lives_ok(
  $$DELETE FROM public.collections WHERE id = 'e0000001-0000-0000-0000-000000000099'$$,
  'user 1 can delete own collection'
);

SELECT is(
  (SELECT count(*)::int FROM public.collection_items WHERE collection_id = 'e0000001-0000-0000-0000-000000000099'),
  0,
  'collection items were deleted on cascade'
);

SELECT * FROM finish();
ROLLBACK;
