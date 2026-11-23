ALTER TABLE public.it_live_payments
  ADD COLUMN IF NOT EXISTS voucher_id uuid REFERENCES public.vouchers(id),
  ADD COLUMN IF NOT EXISTS voucher_code text,
  ADD COLUMN IF NOT EXISTS original_amount_cents integer,
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0;