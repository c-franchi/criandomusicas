-- Add new fields for voice type and phonetic lyrics system

-- Add voice_type to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS voice_type text DEFAULT NULL;

-- Add phonetic_body to lyrics table (stores phonetic pronunciation version)
ALTER TABLE public.lyrics 
ADD COLUMN IF NOT EXISTS phonetic_body text DEFAULT NULL;

-- Add pronunciations JSON field to orders for storing term pronunciations
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pronunciations jsonb DEFAULT NULL;

COMMENT ON COLUMN public.orders.voice_type IS 'Preferred voice type: masculina, feminina, dueto, dupla_masc, dupla_fem, mista';
COMMENT ON COLUMN public.lyrics.phonetic_body IS 'Phonetic pronunciation version of lyrics used for music generation';
COMMENT ON COLUMN public.orders.pronunciations IS 'JSON mapping of technical terms to their phonetic pronunciations';