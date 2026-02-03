-- Drop the existing unique constraint on order_id only
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_order_id_unique;
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_order_id_key;

-- Also drop the unique index if it exists
DROP INDEX IF EXISTS tracks_order_id_unique;
DROP INDEX IF EXISTS tracks_order_id_key;

-- Create a new composite unique constraint on (order_id, version)
ALTER TABLE public.tracks ADD CONSTRAINT tracks_order_id_version_unique UNIQUE (order_id, version);