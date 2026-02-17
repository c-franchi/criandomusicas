
-- Add column to tracks table to store user permission for home page display
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS allow_home_display boolean DEFAULT false;

-- Allow users to update allow_home_display on their own tracks
-- (existing policy "Users can update tracks of their orders" already covers this)
