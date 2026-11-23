CREATE OR REPLACE FUNCTION public.guard_customer_order_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.payment_status <> 'PENDING' OR NEW.status NOT IN ('DRAFT', 'AWAITING_PAYMENT') THEN
    RAISE EXCEPTION 'New orders must await server-confirmed payment';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER customer_order_insert_guard BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_order_insert();

CREATE OR REPLACE FUNCTION public.guard_customer_video_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.amount <> 5000 OR NEW.payment_status <> 'PENDING' OR NEW.status <> 'AWAITING_PAYMENT' OR NEW.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'New video orders require the server price and pending payment';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER customer_video_insert_guard BEFORE INSERT ON public.video_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_video_insert();

CREATE OR REPLACE FUNCTION public.guard_reaction_video_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF coalesce(NEW.is_approved, false) THEN RAISE EXCEPTION 'Reaction approval is controlled by administrators'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reaction_video_insert_guard BEFORE INSERT ON public.reaction_videos
FOR EACH ROW EXECUTE FUNCTION public.guard_reaction_video_insert();

CREATE OR REPLACE FUNCTION public.guard_credit_transfer_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE claims jsonb;
BEGIN
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  IF coalesce(claims->>'role', '') <> 'authenticated' OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Transfers must be created by the credit server';
END;
$$;
CREATE TRIGGER credit_transfer_insert_guard BEFORE INSERT ON public.credit_transfers
FOR EACH ROW EXECUTE FUNCTION public.guard_credit_transfer_insert();