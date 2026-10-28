-- A gift keeps its original quote and atomically records one voucher, net price and redemption.
alter table public.musical_gifts add column if not exists original_amount_cents integer;
alter table public.musical_gifts add column if not exists voucher_discount_cents integer not null default 0;
alter table public.musical_gifts add column if not exists voucher_code text;
alter table public.musical_gifts add column if not exists checkout_lease uuid;
alter table public.musical_gifts add column if not exists checkout_locked_until timestamptz;
alter table public.musical_gifts drop constraint if exists musical_gifts_amount_cents_check;
alter table public.musical_gifts add constraint musical_gifts_amount_cents_check check(amount_cents>=0);
alter table public.musical_gifts add constraint musical_gifts_voucher_quote_check check(
 original_amount_cents is null or (original_amount_cents>0 and voucher_discount_cents between 0 and original_amount_cents and amount_cents=original_amount_cents-voucher_discount_cents));

create or replace function gift_private.gift_voucher(p_order_id uuid,p_code text,p_apply boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); o public.orders; g public.musical_gifts; v public.vouchers; original integer; eligible integer; discount integer; final integer; uses integer; result jsonb;
begin
 if uid is null then raise exception 'gift_auth_required';end if;
 -- The order is always locked first, matching the payment synchronization trigger.
 select * into o from public.orders where id=p_order_id and user_id=uid for update;
 if not found then raise exception 'gift_forbidden';end if;
 select * into g from public.musical_gifts where checkout_order_id=o.id and owner_id=uid for update;
 if not found or g.is_test then raise exception 'gift_voucher_unavailable';end if;
 if g.voucher_code is not null then
  if g.voucher_code<>upper(btrim(p_code)) then raise exception 'gift_voucher_already_applied';end if;
  return jsonb_build_object('success',true,'valid',true,'already_applied',true,'gift_id',g.id,'original_price',g.original_amount_cents,'discount_amount',g.voucher_discount_cents,'final_price',g.amount_cents,'is_free',g.amount_cents=0,'voucher',jsonb_build_object('code',g.voucher_code));
 end if;
 if g.status<>'AWAITING_PAYMENT' or g.payment_confirmed_at is not null or o.payment_status not in ('PENDING','AWAITING_PIX') or o.pix_receipt_url is not null then raise exception 'gift_voucher_locked';end if;
 if g.amount_cents is null or g.amount_cents<=0 or o.amount is distinct from g.amount_cents or o.plan_id is distinct from g.plan_id then raise exception 'gift_order_mismatch';end if;
 if p_apply and (g.checkout_locked_until>now() or g.stripe_session_id is not null) then raise exception 'gift_checkout_busy';end if;
 select * into v from public.vouchers where code=upper(btrim(p_code)) and is_active for update;
 if not found then raise exception 'gift_voucher_invalid';end if;
 if v.valid_from>now() then raise exception 'gift_voucher_not_started';end if;
 if v.valid_until<now() then raise exception 'gift_voucher_expired';end if;
 if v.max_uses is not null and coalesce(v.current_uses,0)>=v.max_uses then raise exception 'gift_voucher_limit';end if;
 if cardinality(v.plan_ids)>0 and not (g.plan_id=any(v.plan_ids)) then raise exception 'gift_voucher_product';end if;
 select count(*) into uses from public.voucher_redemptions where voucher_id=v.id and user_id=uid;
 if v.max_uses_per_user is not null and uses>=v.max_uses_per_user then raise exception 'gift_voucher_user_limit';end if;
 original:=g.amount_cents; eligible:=greatest(0,original-g.shipping_cents);
 if v.discount_value<=0 or v.discount_type not in ('percent','fixed') or (v.discount_type='percent' and v.discount_value>100) then raise exception 'gift_voucher_invalid';end if;
 discount:=case when v.discount_type='percent' then round(eligible::numeric*v.discount_value/100)::integer else least(v.discount_value,eligible) end;
 discount:=least(eligible,discount);final:=original-discount;
 if discount<=0 then raise exception 'gift_voucher_no_discount';end if;
 result:=jsonb_build_object('success',true,'valid',true,'gift_id',g.id,'original_price',original,'discount_amount',discount,'final_price',final,'is_free',final=0,'voucher',jsonb_build_object('id',v.id,'code',v.code,'discount_type',v.discount_type,'discount_value',v.discount_value));
 if not p_apply then return result;end if;
 insert into public.voucher_redemptions(voucher_id,user_id,order_id,discount_applied) values(v.id,uid,o.id,discount);
 update public.vouchers set current_uses=coalesce(current_uses,0)+1 where id=v.id;
 update public.musical_gifts set original_amount_cents=original,voucher_discount_cents=discount,voucher_code=v.code,amount_cents=final,
 payment_confirmed_at=case when final=0 then now() else null end,status=case when final=0 then case when music_source='new' then 'PRODUCTION' else 'PAID' end else status end,version=version+1 where id=g.id;
 update public.orders set amount=final,voucher_code=v.code,discount_applied=discount,
 payment_status=case when final=0 then 'PAID'::public.payment_status else payment_status end,
 status=case when final=0 then case when g.music_source='new' then 'LYRICS_PENDING'::public.order_status else 'COMPLETED'::public.order_status end else status end where id=o.id;
 insert into public.musical_gift_events(gift_id,event,actor_id) values(g.id,'voucher_applied',uid);
 return result;
end $$;
revoke all on function gift_private.gift_voucher(uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function gift_private.gift_voucher(uuid,text,boolean) to authenticated;
create or replace function public.quote_gift_voucher(p_order_id uuid,p_code text) returns jsonb language sql security invoker set search_path='' as $$ select gift_private.gift_voucher(p_order_id,p_code,false); $$;
create or replace function public.apply_gift_voucher(p_order_id uuid,p_code text) returns jsonb language sql security invoker set search_path='' as $$ select gift_private.gift_voucher(p_order_id,p_code,true); $$;
revoke all on function public.quote_gift_voucher(uuid,text),public.apply_gift_voucher(uuid,text) from public,anon,service_role;
grant execute on function public.quote_gift_voucher(uuid,text),public.apply_gift_voucher(uuid,text) to authenticated;

-- A short lease bridges the external Stripe request. A voucher cannot change a price
-- while that checkout is being created. The pending session must be expired before a change.
create or replace function gift_private.checkout_action(p_order_id uuid,p_owner uuid,p_action text,p_lease uuid default null,p_session text default null,p_expires timestamptz default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts; lease uuid;
begin
 perform 1 from public.orders where id=p_order_id and user_id=p_owner for update;
 if not found then raise exception 'gift_forbidden';end if;
 select * into g from public.musical_gifts where checkout_order_id=p_order_id and owner_id=p_owner for update;
 if not found or g.is_test or g.payment_confirmed_at is not null or g.status<>'AWAITING_PAYMENT' or coalesce(g.amount_cents,0)<=0 then raise exception 'gift_invalid_payment';end if;
 if p_action='claim' then
  if g.checkout_locked_until>now() or g.stripe_session_id is not null then raise exception 'gift_checkout_busy';end if;
  lease:=gen_random_uuid();
  update public.musical_gifts set checkout_lease=lease,checkout_locked_until=now()+interval '2 minutes' where id=g.id;
  return jsonb_build_object('lease',lease,'amount',g.amount_cents);
 elsif p_action='attach' then
  if g.checkout_lease is null or p_lease is null or g.checkout_lease is distinct from p_lease or g.checkout_locked_until is null or g.checkout_locked_until<=now() or g.stripe_session_id is not null or p_session is null or p_expires is null or p_expires<=now() then raise exception 'gift_checkout_busy';end if;
  update public.musical_gifts set stripe_session_id=p_session,checkout_locked_until=p_expires+interval '1 minute' where id=g.id;
 elsif p_action='release' then
  if g.checkout_lease is distinct from p_lease or g.stripe_session_id is distinct from p_session then raise exception 'gift_checkout_busy';end if;
  update public.musical_gifts set checkout_lease=null,checkout_locked_until=null,stripe_session_id=null where id=g.id;
 else raise exception 'gift_invalid_action';end if;
 return jsonb_build_object('success',true);
end $$;
revoke all on function gift_private.checkout_action(uuid,uuid,text,uuid,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function gift_private.checkout_action(uuid,uuid,text,uuid,text,timestamptz) to service_role;
create or replace function public.gift_checkout_action(p_order_id uuid,p_owner uuid,p_action text,p_lease uuid default null,p_session text default null,p_expires timestamptz default null) returns jsonb language sql security invoker set search_path='' as $$ select gift_private.checkout_action(p_order_id,p_owner,p_action,p_lease,p_session,p_expires); $$;
revoke all on function public.gift_checkout_action(uuid,uuid,text,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.gift_checkout_action(uuid,uuid,text,uuid,text,timestamptz) to service_role;

create or replace function gift_private.sync_gift_order() returns trigger
language plpgsql security definer set search_path='' as $$
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
end $$;
