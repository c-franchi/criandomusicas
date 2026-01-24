-- Add audio_type column to audio_samples table to distinguish vocal vs instrumental
ALTER TABLE public.audio_samples 
ADD COLUMN audio_type text NOT NULL DEFAULT 'vocal' CHECK (audio_type IN ('vocal', 'instrumental'));

-- Update existing samples based on style hints (if needed, admin can adjust later)
COMMENT ON COLUMN public.audio_samples.audio_type IS 'Type of audio sample: vocal or instrumental';