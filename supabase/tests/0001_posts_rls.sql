BEGIN;
SELECT plan(29);

-- Ensure test fixture posts exist within the test transaction
INSERT INTO public.posts (id, type, title, content, author_id)
VALUES 
  ('a0000001-0000-0000-0000-000000000001', 'discussion', 'Post 1', 'Content 1', '11111111-1111-4111-a111-111111111111'),
  ('a0000001-0000-0000-0000-000000000002', 'guide', 'Post 2', 'Content 2', '22222222-2222-4222-a222-222222222222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.comments (id, post_id, content, author_id)
VALUES
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'Comment 1', '22222222-2222-4222-a222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- 1. Check tables exist
SELECT has_table('public', 'profiles', 'public.profiles table should exist');
SELECT has_table('public', 'posts', 'public.posts table should exist');
SELECT has_table('public', 'comments', 'public.comments table should exist');

-- 2. Check RLS is enabled on all tables
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles'), 'public.profiles should have RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname = 'posts'), 'public.posts should have RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname = 'comments'), 'public.comments should have RLS enabled');

-- 3. Check composite index exists for cursor pagination
SELECT has_index('public', 'posts', 'idx_posts_created_at_id_desc', 'idx_posts_created_at_id_desc index should exist');

-- 4. Test anon permissions
SET ROLE anon;

-- Anon can read profiles, posts, comments
SELECT lives_ok('SELECT count(*) FROM public.profiles', 'anon can select profiles');
SELECT lives_ok('SELECT count(*) FROM public.posts', 'anon can select posts');
SELECT lives_ok('SELECT count(*) FROM public.comments', 'anon can select comments');

-- Anon cannot write (INSERT / DELETE / UPDATE)
SELECT throws_ok(
  $$INSERT INTO public.posts (type, title, content, author_id) VALUES ('discussion', 'Test', 'Content', '11111111-1111-4111-a111-111111111111')$$,
  '42501',
  NULL,
  'anon cannot insert posts'
);

SELECT throws_ok(
  $$INSERT INTO public.comments (post_id, content, author_id) VALUES ('a0000001-0000-0000-0000-000000000001', 'Test', '11111111-1111-4111-a111-111111111111')$$,
  '42501',
  NULL,
  'anon cannot insert comments'
);

SELECT throws_ok(
  $$INSERT INTO public.profiles (id, name, handle, initials) VALUES (gen_random_uuid(), 'Test', 'test', 'T')$$,
  '42501',
  NULL,
  'anon cannot insert profiles'
);

SELECT throws_ok(
  $$DELETE FROM public.posts$$,
  '42501',
  NULL,
  'anon cannot delete posts'
);

SELECT throws_ok(
  $$DELETE FROM public.profiles$$,
  '42501',
  NULL,
  'anon cannot delete profiles'
);

-- 5. Test authenticated permissions and owner checks
SET ROLE authenticated;

-- Set user session to user 1
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-a111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-a111-111111111111"}', true);

-- User 1 can insert their own post
SELECT lives_ok(
  $$INSERT INTO public.posts (id, type, title, content, author_id) VALUES ('f0000001-0000-0000-0000-000000000001', 'discussion', 'Auth test post', 'Auth content', '11111111-1111-4111-a111-111111111111')$$,
  'authenticated user can insert their own post'
);

-- User 1 cannot insert post for user 2
SELECT throws_ok(
  $$INSERT INTO public.posts (id, type, title, content, author_id) VALUES ('f0000001-0000-0000-0000-000000000002', 'discussion', 'Fake post', 'Fake content', '22222222-2222-4222-a222-222222222222')$$,
  '42501',
  NULL,
  'authenticated user cannot insert post with another author_id'
);

-- User 1 can update their own post
SELECT lives_ok(
  $$UPDATE public.posts SET title = 'Updated post title' WHERE id = 'f0000001-0000-0000-0000-000000000001'$$,
  'authenticated user can update their own post'
);

-- User 1 cannot update user 2's post
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  UPDATE public.posts SET title = 'Hacked title' WHERE id = 'a0000001-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to update another users post';
  END IF;
END $$;
SELECT pass('authenticated user cannot update another user post');

-- User 1 can delete their own post
SELECT lives_ok(
  $$DELETE FROM public.posts WHERE id = 'f0000001-0000-0000-0000-000000000001'$$,
  'authenticated user can delete their own post'
);

-- User 1 cannot delete user 2's post
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  DELETE FROM public.posts WHERE id = 'a0000001-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to delete another users post';
  END IF;
END $$;
SELECT pass('authenticated user cannot delete another user post');

-- User 1 can insert their own comment
SELECT lives_ok(
  $$INSERT INTO public.comments (id, post_id, content, author_id) VALUES ('c0000001-0000-0000-0000-000000000099', 'a0000001-0000-0000-0000-000000000002', 'User 1 comment', '11111111-1111-4111-a111-111111111111')$$,
  'authenticated user can insert their own comment'
);

-- User 1 cannot insert comment with user 2 author_id
SELECT throws_ok(
  $$INSERT INTO public.comments (id, post_id, content, author_id) VALUES ('c0000001-0000-0000-0000-000000000098', 'a0000001-0000-0000-0000-000000000002', 'Fake comment', '22222222-2222-4222-a222-222222222222')$$,
  '42501',
  NULL,
  'authenticated user cannot insert comment with another author_id'
);

-- User 1 can update their own comment
SELECT lives_ok(
  $$UPDATE public.comments SET content = 'Updated comment content' WHERE id = 'c0000001-0000-0000-0000-000000000099'$$,
  'authenticated user can update their own comment'
);

-- User 1 cannot update user 2's comment
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  UPDATE public.comments SET content = 'Hacked comment' WHERE id = 'b0000001-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to update another users comment';
  END IF;
END $$;
SELECT pass('authenticated user cannot update another user comment');

-- User comments use soft-delete; physical delete is not granted.
SELECT throws_ok(
  $$DELETE FROM public.comments WHERE id = 'c0000001-0000-0000-0000-000000000099'$$,
  '42501',
  NULL,
  'authenticated user cannot physically delete comments'
);

-- User 1 cannot delete user 2's comment
SELECT throws_ok(
  $$DELETE FROM public.comments WHERE id = 'b0000001-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'authenticated user cannot physically delete another user comment'
);

-- User 1 can update their own profile
SELECT lives_ok(
  $$UPDATE public.profiles SET name = 'Алексей Смирнов (Обновлено)' WHERE id = '11111111-1111-4111-a111-111111111111'$$,
  'authenticated user can update their own profile'
);

-- User 1 cannot update user 2's profile
DO $$
DECLARE
  v_rows_affected int;
BEGIN
  UPDATE public.profiles SET name = 'Hacked Profile' WHERE id = '22222222-2222-4222-a222-222222222222';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected != 0 THEN
    RAISE EXCEPTION 'Non-owner should not be able to update another users profile';
  END IF;
END $$;
SELECT pass('authenticated user cannot update another user profile');

SELECT * FROM finish();
ROLLBACK;
