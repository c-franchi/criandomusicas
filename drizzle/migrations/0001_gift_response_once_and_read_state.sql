ALTER TABLE public.gift_responses ADD CONSTRAINT gift_response_one_per_gift UNIQUE(gift_id);
ALTER TABLE public.gift_responses ADD COLUMN read_at timestamptz;
GRANT UPDATE(read_at) ON public.gift_responses TO authenticated;
CREATE POLICY gift_response_owner_ack ON public.gift_responses FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());