-- Tabela para rastrear transferencias de creditos
CREATE TABLE public.credit_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_email TEXT NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  credits_amount INTEGER NOT NULL,
  credit_type TEXT NOT NULL DEFAULT 'vocal',
  source_credit_id UUID NOT NULL REFERENCES public.user_credits(id),
  status TEXT NOT NULL DEFAULT 'pending',
  transfer_code TEXT UNIQUE NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.credit_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view transfers they sent
CREATE POLICY "Users can view their sent transfers"
  ON public.credit_transfers FOR SELECT
  USING (auth.uid() = from_user_id);

-- Users can view transfers sent to them (by user_id or email)
CREATE POLICY "Users can view transfers to them"
  ON public.credit_transfers FOR SELECT
  USING (to_user_id = auth.uid());

-- Users can create transfers from their own credits
CREATE POLICY "Users can create transfers"
  ON public.credit_transfers FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Users can update transfers sent to them (accept/reject)
CREATE POLICY "Users can update transfers to them"
  ON public.credit_transfers FOR UPDATE
  USING (to_user_id = auth.uid());

-- Admins can view all transfers
CREATE POLICY "Admins can view all transfers"
  ON public.credit_transfers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all transfers
CREATE POLICY "Admins can update all transfers"
  ON public.credit_transfers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX idx_credit_transfers_from_user ON public.credit_transfers(from_user_id);
CREATE INDEX idx_credit_transfers_to_user ON public.credit_transfers(to_user_id);
CREATE INDEX idx_credit_transfers_status ON public.credit_transfers(status);
CREATE INDEX idx_credit_transfers_code ON public.credit_transfers(transfer_code);