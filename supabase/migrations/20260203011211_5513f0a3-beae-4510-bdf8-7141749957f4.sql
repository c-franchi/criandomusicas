-- Add version column to tracks table
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Remove the one-to-one unique constraint on order_id to allow multiple tracks
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_order_id_key;

-- Add a unique constraint on (order_id, version) to ensure one track per version per order
ALTER TABLE public.tracks ADD CONSTRAINT tracks_order_version_unique UNIQUE (order_id, version);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tracks_order_version ON public.tracks (order_id, version);