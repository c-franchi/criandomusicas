CREATE TABLE public.gift_responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 gift_id uuid NOT NULL REFERENCES public.musical_gifts(id),
 owner_id uuid NOT NULL,
 request_id uuid NOT NULL UNIQUE,
 emoji text NOT NULL,
 message text NOT NULL DEFAULT '',
 rating integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 email_status text NOT NULL DEFAULT 'pending',
 email_error text,
 CONSTRAINT gift_response_emoji CHECK (emoji IN ('💜','😍','🥹','😂','👏','🎉')),
 CONSTRAINT gift_response_message CHECK (char_length(message)<=500),
 CONSTRAINT gift_response_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);
GRANT SELECT ON public.gift_responses TO authenticated;
GRANT ALL ON public.gift_responses TO service_role;
ALTER TABLE public.gift_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY gift_response_owner_read ON public.gift_responses FOR SELECT TO authenticated USING (owner_id=auth.uid());
CREATE INDEX gift_response_owner_created_idx ON public.gift_responses(owner_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.submit_gift_response(p_token text,p_request_id uuid,p_emoji text,p_message text,p_rating integer DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.musical_gifts; r public.gift_responses;
BEGIN
 IF p_token IS NULL OR NOT (p_token ~ '^[a-f0-9]{64}$' OR p_token ~ '^para-[a-z0-9-]{1,32}-[A-Za-z0-9_-]{22}$') THEN RAISE EXCEPTION 'gift_unavailable'; END IF;
 IF public.get_musical_gift(p_token) IS NULL THEN RAISE EXCEPTION 'gift_unavailable'; END IF;
 SELECT * INTO g FROM public.musical_gifts WHERE public_token=p_token OR public_alias=p_token FOR UPDATE;
 SELECT * INTO r FROM public.gift_responses WHERE request_id=p_request_id;
 IF FOUND THEN
  IF r.gift_id<>g.id THEN RAISE EXCEPTION 'gift_response_conflict'; END IF;
  RETURN jsonb_build_object('id',r.id,'created',false);
 END IF;
 INSERT INTO public.gift_responses(gift_id,owner_id,request_id,emoji,message,rating)
 VALUES(g.id,g.owner_id,p_request_id,p_emoji,trim(coalesce(p_message,'')),p_rating) RETURNING * INTO r;
 RETURN jsonb_build_object('id',r.id,'created',true);
END; $$;
REVOKE ALL ON FUNCTION public.submit_gift_response(text,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_gift_response(text,uuid,text,text,integer) TO service_role;