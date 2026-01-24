-- Add pix_rejection_reason column to orders for rejection flow
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_rejection_reason TEXT;