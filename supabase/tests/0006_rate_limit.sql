BEGIN;
SELECT plan(3);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-a111-111111111111', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-a111-111111111111"}', true);

SELECT lives_ok(
  $$INSERT INTO public.posts (type, title, content, author_id)
    VALUES ('discussion', 'Rate limit normal write', 'Normal write', auth.uid())$$,
  'normal authenticated write is allowed'
);

CREATE TEMP TABLE rate_limit_observations (allowed int NOT NULL, blocked int NOT NULL);
DO $$
DECLARE
  i int;
  allowed_count int := 0;
  blocked_count int := 0;
BEGIN
  FOR i IN 1..6 LOOP
    BEGIN
      INSERT INTO public.posts (type, title, content, author_id)
        VALUES ('discussion', 'Rate limit burst ' || i, 'Burst write', auth.uid());
      allowed_count := allowed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%write rate limit exceeded%' THEN
        blocked_count := blocked_count + 1;
      ELSE
        RAISE;
      END IF;
    END;
  END LOOP;
  INSERT INTO rate_limit_observations VALUES (allowed_count, blocked_count);
END $$;

SELECT is(
  (SELECT allowed FROM rate_limit_observations),
  4,
  'rate limit allows only remaining writes within the per-minute ceiling'
);
SELECT is(
  (SELECT blocked FROM rate_limit_observations),
  2,
  'rate limit blocks the excess burst'
);

SELECT * FROM finish();
ROLLBACK;
