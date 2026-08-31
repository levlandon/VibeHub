BEGIN;
SELECT plan(18);

INSERT INTO public.posts (id, type, title, content, author_id) VALUES
  ('f1000001-0000-0000-0000-000000000001', 'question', 'Question', 'Question body', '11111111-1111-4111-a111-111111111111'),
  ('f1000001-0000-0000-0000-000000000002', 'question', 'Other question', 'Other body', '22222222-2222-4222-a222-222222222222');
INSERT INTO public.comments (id, post_id, author_id, content) VALUES
  ('f2000001-0000-0000-0000-000000000001', 'f1000001-0000-0000-0000-000000000001', '22222222-2222-4222-a222-222222222222', 'Answer'),
  ('f2000001-0000-0000-0000-000000000002', 'f1000001-0000-0000-0000-000000000002', '11111111-1111-4111-a111-111111111111', 'Other answer');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-a111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-a111-111111111111"}', true);

SELECT lives_ok(
  $$INSERT INTO public.comments (id, post_id, author_id, content) VALUES ('f2000001-0000-0000-0000-000000000003', 'f1000001-0000-0000-0000-000000000001', '11111111-1111-4111-a111-111111111111', 'Root')$$,
  'user can create own root comment'
);
SELECT lives_ok(
  $$INSERT INTO public.comments (id, post_id, author_id, content, parent_comment_id, reply_to_comment_id) VALUES ('f2000001-0000-0000-0000-000000000004', 'f1000001-0000-0000-0000-000000000001', '11111111-1111-4111-a111-111111111111', 'Reply', 'f2000001-0000-0000-0000-000000000003', 'f2000001-0000-0000-0000-000000000003')$$,
  'user can create a one-level reply'
);
SELECT throws_ok(
  $$INSERT INTO public.comments (post_id, author_id, content, parent_comment_id) VALUES ('f1000001-0000-0000-0000-000000000001', '11111111-1111-4111-a111-111111111111', 'Cross post', 'f2000001-0000-0000-0000-000000000002')$$,
  NULL, NULL, 'cross-post parent is rejected'
);
SELECT throws_ok(
  $$INSERT INTO public.comments (id, post_id, author_id, content, parent_comment_id) VALUES ('f2000001-0000-0000-0000-000000000005', 'f1000001-0000-0000-0000-000000000001', '11111111-1111-4111-a111-111111111111', 'Self', 'f2000001-0000-0000-0000-000000000005')$$,
  NULL, NULL, 'self parent is rejected'
);
SELECT throws_ok(
  $$UPDATE public.comments SET parent_comment_id = 'f2000001-0000-0000-0000-000000000004' WHERE id = 'f2000001-0000-0000-0000-000000000003'$$,
  NULL, NULL, 'cycle or non-root parent is rejected'
);
SELECT lives_ok(
  $$UPDATE public.posts SET accepted_answer_id = 'f2000001-0000-0000-0000-000000000001', solved = true WHERE id = 'f1000001-0000-0000-0000-000000000001'$$,
  'question owner can accept an active answer'
);
SELECT is(
  (SELECT accepted_answer_id::text FROM public.posts WHERE id = 'f1000001-0000-0000-0000-000000000001'),
  'f2000001-0000-0000-0000-000000000001',
  'accepted answer persists in the database'
);
SELECT throws_ok(
  $$UPDATE public.posts SET accepted_answer_id = 'f2000001-0000-0000-0000-000000000002', solved = true WHERE id = 'f1000001-0000-0000-0000-000000000001'$$,
  NULL, NULL, 'cross-post accepted answer is rejected'
);

SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-a222-222222222222', true);
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-a222-222222222222"}', true);
UPDATE public.posts SET solved = false, accepted_answer_id = NULL
  WHERE id = 'f1000001-0000-0000-0000-000000000001';
SELECT is(
  (SELECT accepted_answer_id::text FROM public.posts WHERE id = 'f1000001-0000-0000-0000-000000000001'),
  'f2000001-0000-0000-0000-000000000001',
  'non-owner cannot change accepted answer'
);
UPDATE public.comments SET content = 'hacked'
  WHERE id = 'f2000001-0000-0000-0000-000000000003';
SELECT is(
  (SELECT content FROM public.comments WHERE id = 'f2000001-0000-0000-0000-000000000003'),
  'Root',
  'user cannot edit another users comment'
);

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-a111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-a111-111111111111"}', true);
SELECT lives_ok(
  $$UPDATE public.comments SET deleted_at = now() WHERE id = 'f2000001-0000-0000-0000-000000000003'$$,
  'owner can soft-delete own comment'
);
SELECT is(
  (SELECT content FROM public.comments WHERE id = 'f2000001-0000-0000-0000-000000000003'),
  '',
  'soft-deleted content is redacted at the database boundary'
);
SELECT is(
  (SELECT count(*)::int FROM public.comments WHERE parent_comment_id = 'f2000001-0000-0000-0000-000000000003'),
  1,
  'soft-delete preserves replies'
);
SELECT throws_ok(
  $$UPDATE public.comments SET deleted_at = NULL, content = 'restored' WHERE id = 'f2000001-0000-0000-0000-000000000003'$$,
  NULL, NULL, 'deleted comments cannot be restored through public update'
);
SELECT throws_ok(
  $$INSERT INTO public.comments (post_id, author_id, content) VALUES ('f1000001-0000-0000-0000-000000000001', '11111111-1111-4111-a111-111111111111', '   ')$$,
  '23514', NULL, 'blank comment content is rejected'
);
SELECT throws_ok(
  $$INSERT INTO public.posts (type, title, content, author_id) VALUES ('discussion', repeat('x', 201), 'body', '11111111-1111-4111-a111-111111111111')$$,
  '23514', NULL, 'oversized post title is rejected'
);
SELECT throws_ok(
  $$DELETE FROM public.profiles WHERE id = '11111111-1111-4111-a111-111111111111'$$,
  '42501', NULL, 'profiles cannot be directly deleted'
);
SELECT throws_ok(
  $$DELETE FROM public.comments WHERE id = 'f2000001-0000-0000-0000-000000000003'$$,
  '42501', NULL, 'comments cannot be physically deleted'
);

SELECT * FROM finish();
ROLLBACK;
