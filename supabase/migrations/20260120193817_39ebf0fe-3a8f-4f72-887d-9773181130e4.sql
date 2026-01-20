-- Create vouchers table for discount codes
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  plan_ids TEXT[] DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  stripe_coupon_id TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create voucher redemptions table to track usage
CREATE TABLE public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Vouchers policies
CREATE POLICY "Anyone can view active vouchers"
ON public.vouchers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage vouchers"
ON public.vouchers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Voucher redemptions policies
CREATE POLICY "Users can create their own redemptions"
ON public.voucher_redemptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own redemptions"
ON public.voucher_redemptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON public.voucher_redemptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add voucher_code column to orders for tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voucher_code TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_applied INTEGER DEFAULT 0;