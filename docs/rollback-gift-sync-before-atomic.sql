CREATE OR REPLACE FUNCTION gift_private.sync_gift_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare g public.musical_gifts;
begin
 select * into g from public.musical_gifts where checkout_order_id=new.id or production_order_id=new.id for update;
 if not found then return new; end if;
 if g.photo_data is not null then new.cover_url:=g.photo_data; end if;
 if new.user_id<>g.owner_id or (not g.is_test and (new.amount is distinct from g.amount_cents or new.plan_id is distinct from g.plan_id or new.voucher_code is distinct from g.voucher_code or coalesce(new.discount_applied,0)<>g.voucher_discount_cents)) then raise exception 'gift_order_mismatch'; end if;
 if new.payment_status='PAID' and old.payment_status is distinct from new.payment_status and not coalesce(public.has_role(auth.uid(),'admin'),false) and not (coalesce(auth.jwt()->>'role','')='service_role' and g.payment_confirmed_at is not null) and not (g.amount_cents=0 and g.voucher_code is not null and g.payment_confirmed_at is not null and exists(select 1 from public.voucher_redemptions r where r.order_id=new.id and r.user_id=g.owner_id and r.discount_applied=g.voucher_discount_cents)) then raise exception 'gift_payment_forbidden'; end if;
 if g.music_source='new' and new.status in ('LYRICS_APPROVED','MUSIC_GENERATING','MUSIC_READY','COMPLETED') then
  if not g.is_test and new.payment_status<>'PAID' then raise exception 'gift_invalid_payment'; end if;
  if not exists(select 1 from public.lyrics where id=new.approved_lyric_id and order_id=new.id) then raise exception 'gift_lyrics_approval_required'; end if;
 end if;
 if pg_trigger_depth()>1 then return new; end if;
 if new.payment_status='PAID' and not g.is_test then
  update public.musical_gifts set payment_confirmed_at=coalesce(payment_confirmed_at,now()),approved_by=coalesce(approved_by,auth.uid()),status=case when status in ('ACTIVE','CANCELLED') then status when new.status in ('LYRICS_PENDING','LYRICS_GENERATED','LYRICS_APPROVED','MUSIC_GENERATING','MUSIC_READY','COMPLETED') and music_source='new' then 'PRODUCTION' else 'PAID' end,version=version+1 where id=g.id;
 elsif new.payment_status='AWAITING_PIX' and g.status in ('AWAITING_PAYMENT','RECEIPT_SENT') then
  update public.musical_gifts set status=case when new.pix_receipt_url is null then 'AWAITING_PAYMENT' else 'RECEIPT_SENT' end,admin_message=new.pix_rejection_reason,version=version+1 where id=g.id;
 elsif new.status='CANCELLED' and g.status in ('AWAITING_PAYMENT','RECEIPT_SENT') then
  update public.musical_gifts set status='CANCELLED',version=version+1 where id=g.id;
 end if;
 return new;
end $function$;
