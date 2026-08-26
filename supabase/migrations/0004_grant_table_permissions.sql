-- Grant table-level permissions to anon and authenticated roles so RLS policies can evaluate.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Anon role: read-only on public tables
GRANT SELECT ON public.profiles, public.posts, public.comments TO anon;

-- Authenticated role: full DML on public tables (restricted by row level security policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.posts, public.comments TO authenticated;
