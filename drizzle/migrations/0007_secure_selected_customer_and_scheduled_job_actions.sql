CREATE TABLE public.scheduled_job_credentials (
  job_name text PRIMARY KEY,
  credential uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.scheduled_job_credentials TO service_role;
ALTER TABLE public.scheduled_job_credentials ENABLE ROW LEVEL SECURITY;
INSERT INTO public.scheduled_job_credentials (job_name)
VALUES ('send-reengagement-email'), ('send-review-reminder')
ON CONFLICT (job_name) DO NOTHING;

DROP TRIGGER IF EXISTS on_auth_user_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_admin_role();

CREATE OR REPLACE FUNCTION public.guard_customer_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NOT (OLD.payment_status IN ('PENDING', 'AWAITING_PIX') AND NEW.payment_status IN ('PENDING', 'AWAITING_PIX')) THEN
    RAISE EXCEPTION 'Payment status is controlled by the payment server';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'PAID' AND OLD.status <> 'PAID' THEN
    RAISE EXCEPTION 'Order payment status is controlled by the payment server';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS customer_order_payment_guard ON public.orders;
CREATE TRIGGER customer_order_payment_guard
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_order_payment();

CREATE OR REPLACE FUNCTION public.guard_customer_video_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND NOT (OLD.payment_status IN ('PENDING', 'AWAITING_PIX') AND NEW.payment_status IN ('PENDING', 'AWAITING_PIX')) THEN
    RAISE EXCEPTION 'Video payment status is controlled by the payment server';
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    RAISE EXCEPTION 'Video price and payment time are controlled by the payment server';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS customer_video_payment_guard ON public.video_orders;
CREATE TRIGGER customer_video_payment_guard
BEFORE UPDATE ON public.video_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_video_payment();

CREATE OR REPLACE FUNCTION public.guard_reaction_video_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'Reaction approval is controlled by administrators';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reaction_video_approval_guard ON public.reaction_videos;
CREATE TRIGGER reaction_video_approval_guard
BEFORE UPDATE ON public.reaction_videos
FOR EACH ROW EXECUTE FUNCTION public.guard_reaction_video_approval();

CREATE OR REPLACE FUNCTION public.guard_credit_transfer_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.credits_amount IS DISTINCT FROM OLD.credits_amount
     OR NEW.source_credit_id IS DISTINCT FROM OLD.source_credit_id
     OR NEW.from_user_id IS DISTINCT FROM OLD.from_user_id
     OR NEW.transfer_code IS DISTINCT FROM OLD.transfer_code THEN
    RAISE EXCEPTION 'Transfer value and source are immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS credit_transfer_amount_guard ON public.credit_transfers;
CREATE TRIGGER credit_transfer_amount_guard
BEFORE UPDATE ON public.credit_transfers
FOR EACH ROW EXECUTE FUNCTION public.guard_credit_transfer_amount();

DROP POLICY IF EXISTS "Read gift artwork" ON public.gift_backgrounds;
CREATE POLICY "Read active gift artwork"
ON public.gift_backgrounds FOR SELECT
TO anon, authenticated
USING (is_active = true);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-reengagement-daily';
SELECT cron.schedule(
  'send-reengagement-daily',
  '0 10 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://haiiaqzhuydsjujtdcnq.supabase.co/functions/v1/send-reengagement-email',
    headers := (SELECT jsonb_build_object('Content-Type', 'application/json', 'x-scheduled-job-key', credential::text) FROM public.scheduled_job_credentials WHERE job_name = 'send-reengagement-email'),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);