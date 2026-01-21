-- Add column for music sample permission in reviews table
ALTER TABLE public.reviews 
ADD COLUMN allow_music_sample boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.reviews.allow_music_sample IS 'User permission to use their music as an example on the platform';