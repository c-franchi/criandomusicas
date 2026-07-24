CREATE TABLE public.meta_capi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  event_id text NOT NULL,
  event_name text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  response_status int,
  response_body text
);
GRANT ALL ON public.meta_capi_events TO service_role;
ALTER TABLE public.meta_capi_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.meta_capi_events FOR ALL USING (false) WITH CHECK (false);