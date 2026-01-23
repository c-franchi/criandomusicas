-- Add confidentiality field to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_confidential boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.orders.is_confidential IS 'When true, the lyrics should be treated as confidential and not shared publicly';