-- Migration: 0006_saved_collections.sql
-- Create tables for user-scoped saved items / bookmarks and collections with RLS.

-- 1. Saved items / bookmarks
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('model', 'tool', 'repository', 'post')),
  entity_id text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(entity_id)) >= 1 AND pg_catalog.length(entity_id) <= 200),
  title text NOT NULL DEFAULT '' CHECK (pg_catalog.length(title) <= 200),
  subtitle text NOT NULL DEFAULT '' CHECK (pg_catalog.length(subtitle) <= 200),
  url text NOT NULL DEFAULT '' CHECK (pg_catalog.length(url) <= 1000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_items_user_entity_unique UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items (user_id, created_at DESC);

-- 2. Collections
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(name)) >= 1 AND pg_catalog.length(name) <= 100),
  description text NOT NULL DEFAULT '' CHECK (pg_catalog.length(description) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_collections_updated_at ON public.collections;
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Collection items (membership inside collections)
CREATE TABLE IF NOT EXISTS public.collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(url)) >= 1 AND pg_catalog.length(url) <= 1000),
  title text NOT NULL DEFAULT '' CHECK (pg_catalog.length(title) <= 200),
  domain text NOT NULL DEFAULT '' CHECK (pg_catalog.length(domain) <= 200),
  description text NOT NULL DEFAULT '' CHECK (pg_catalog.length(description) <= 500),
  favicon text NOT NULL DEFAULT '',
  entity_type text CHECK (entity_type IS NULL OR entity_type IN ('model', 'tool', 'repository', 'post')),
  entity_id text CHECK (entity_id IS NULL OR (pg_catalog.length(pg_catalog.btrim(entity_id)) >= 1 AND pg_catalog.length(entity_id) <= 200)),
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_items_collection_url_unique UNIQUE (collection_id, url)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items (collection_id, position ASC, created_at DESC);

DROP TRIGGER IF EXISTS update_collection_items_updated_at ON public.collection_items;
CREATE TRIGGER update_collection_items_updated_at
  BEFORE UPDATE ON public.collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Permissions: authenticated role gets full CRUD, anon gets no permissions on private tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items, public.collections, public.collection_items TO authenticated;

-- Row Level Security
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Policies for saved_items (owner only)
DROP POLICY IF EXISTS "Users can select own saved items" ON public.saved_items;
CREATE POLICY "Users can select own saved items" ON public.saved_items
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved items" ON public.saved_items;
CREATE POLICY "Users can insert own saved items" ON public.saved_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own saved items" ON public.saved_items;
CREATE POLICY "Users can update own saved items" ON public.saved_items
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved items" ON public.saved_items;
CREATE POLICY "Users can delete own saved items" ON public.saved_items
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Policies for collections (owner only)
DROP POLICY IF EXISTS "Users can select own collections" ON public.collections;
CREATE POLICY "Users can select own collections" ON public.collections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own collections" ON public.collections;
CREATE POLICY "Users can insert own collections" ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own collections" ON public.collections;
CREATE POLICY "Users can update own collections" ON public.collections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own collections" ON public.collections;
CREATE POLICY "Users can delete own collections" ON public.collections
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Policies for collection_items (owner of the parent collection only)
DROP POLICY IF EXISTS "Users can select own collection items" ON public.collection_items;
CREATE POLICY "Users can select own collection items" ON public.collection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own collection items" ON public.collection_items;
CREATE POLICY "Users can insert own collection items" ON public.collection_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own collection items" ON public.collection_items;
CREATE POLICY "Users can update own collection items" ON public.collection_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own collection items" ON public.collection_items;
CREATE POLICY "Users can delete own collection items" ON public.collection_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND c.user_id = auth.uid()
    )
  );
