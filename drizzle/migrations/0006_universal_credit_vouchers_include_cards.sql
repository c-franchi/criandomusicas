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
 if cardinality(v.plan_ids)>0 and not (
  g.plan_id=any(v.plan_ids)
  or (g.has_card and exists(select 1 from unnest(v.plan_ids) as allowed_plan where allowed_plan like 'single%'))
 ) then raise exception 'gift_voucher_product';end if;
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