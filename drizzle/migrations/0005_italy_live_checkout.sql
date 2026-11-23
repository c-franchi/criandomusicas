CREATE TABLE public.it_live_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  price_id text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur' CHECK (currency = 'eur'),
  account_id text NOT NULL,
  session_id text UNIQUE,
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','open','paid','failed','expired')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX it_live_payments_order_idx ON public.it_live_payments(order_id);
CREATE UNIQUE INDEX it_live_payments_one_paid ON public.it_live_payments(order_id) WHERE status = 'paid';
GRANT SELECT ON public.it_live_payments TO authenticated;
GRANT ALL ON public.it_live_payments TO service_role;
ALTER TABLE public.it_live_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own Italy payments" ON public.it_live_payments FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE TABLE public.it_live_webhook_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  session_id text,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.it_live_webhook_events TO service_role;
ALTER TABLE public.it_live_webhook_events ENABLE ROW LEVEL SECURITY;