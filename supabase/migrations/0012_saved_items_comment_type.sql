-- Migration: 0012_saved_items_comment_type.sql
-- Allow 'comment' in saved_items and collection_items entity_type check constraints

ALTER TABLE public.saved_items
  DROP CONSTRAINT IF EXISTS saved_items_entity_type_check;

ALTER TABLE public.saved_items
  ADD CONSTRAINT saved_items_entity_type_check
  CHECK (entity_type IN ('model', 'tool', 'repository', 'post', 'comment'));

ALTER TABLE public.collection_items
  DROP CONSTRAINT IF EXISTS collection_items_entity_type_check;

ALTER TABLE public.collection_items
  ADD CONSTRAINT collection_items_entity_type_check
  CHECK (entity_type IS NULL OR entity_type IN ('model', 'tool', 'repository', 'post', 'comment'));
