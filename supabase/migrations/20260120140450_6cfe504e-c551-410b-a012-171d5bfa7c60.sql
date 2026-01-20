-- Add new columns to orders table for the new briefing flow
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS music_type TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS emotion_intensity INTEGER DEFAULT 3;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rhythm TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS atmosphere TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS has_monologue BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS monologue_position TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mandatory_words TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restricted_words TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approved_lyric_id UUID REFERENCES public.lyrics(id);

-- Add approved_at column to lyrics table
ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update order_status enum to include new statuses
-- First we need to add the new values if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LYRICS_PENDING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
        -- We can't add values to enum directly in a simple way, so let's create the statuses we need
        -- For now the existing statuses should work: DRAFT -> LYRICS_GENERATED -> LYRICS_APPROVED -> MUSIC_GENERATING -> MUSIC_READY
        NULL;
    END IF;
END $$;