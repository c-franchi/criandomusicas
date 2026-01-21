-- Add max_uses_per_user column to vouchers table for limiting usage per user
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS max_uses_per_user integer DEFAULT NULL;

COMMENT ON COLUMN public.vouchers.max_uses_per_user IS 'Maximum number of times a single user can use this voucher (null = unlimited per user)';