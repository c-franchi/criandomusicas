-- Add instrumental support columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_instrumental boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS instruments text[],
ADD COLUMN IF NOT EXISTS solo_instrument text,
ADD COLUMN IF NOT EXISTS solo_moment text,
ADD COLUMN IF NOT EXISTS instrumentation_notes text;