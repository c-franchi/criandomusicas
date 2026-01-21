-- Add UNIQUE constraint on order_id to enable upsert operations
ALTER TABLE public.tracks
ADD CONSTRAINT tracks_order_id_unique UNIQUE (order_id);