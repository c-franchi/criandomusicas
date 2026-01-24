-- Add cover_url column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cover_url text;