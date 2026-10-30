-- Sandbox purchases use immutable briefing snapshots and create separate test copies only
-- after a signed payment. A EUR test must never pay or unlock a real BRL order.
begin;
alter table public.it_test_checkouts add column if not exists order_snapshot jsonb, add column if not exists gift_snapshot jsonb,
 add column if not exists fulfillment_order_id uuid references public.orders(id),
 add column if not exists fulfillment_gift_id uuid references public.musical_gifts(id);

create or replace function it_test_private.guard_checkout() returns trigger language plpgsql set search_path='' as $$
begin
 if new.order_id is distinct from old.order_id or new.gift_id is distinct from old.gift_id or new.owner_id is distinct from old.owner_id
  or new.items is distinct from old.items or new.amount_cents is distinct from old.amount_cents or new.currency is distinct from old.currency
  or new.market is distinct from old.market or new.account_id is distinct from old.account_id or new.livemode is distinct from old.livemode
  or new.order_snapshot is distinct from old.order_snapshot or new.gift_snapshot is distinct from old.gift_snapshot
  or (old.fulfillment_order_id is not null and new.fulfillment_order_id is distinct from old.fulfillment_order_id)
  or (old.fulfillment_gift_id is not null and new.fulfillment_gift_id is distinct from old.fulfillment_gift_id)
  or (old.stripe_session_id is not null and new.stripe_session_id is distinct from old.stripe_session_id)
  or (old.status='paid' and new.status<>'paid') then raise exception 'it_test_checkout_immutable'; end if;
 new.updated_at:=now(); return new;
end $$;
-- No original gift lock exists in the isolated copy flow.
create or replace function it_test_private.release_gift(c public.it_test_checkouts) returns void
 language plpgsql security definer set search_path='' as $$ begin return; end $$;
create or replace function it_test_private.attach_session(p_id uuid,p_owner uuid,p_session text,p_expires timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare c public.it_test_checkouts;
begin
 select * into c from public.it_test_checkouts where id=p_id and owner_id=p_owner for update;
 if not found or c.status<>'pending' or p_session !~ '^cs_test_' or p_expires<=now() then raise exception 'it_test_checkout_busy'; end if;
 update public.it_test_checkouts set status='open',stripe_session_id=p_session,expires_at=p_expires where id=p_id;
 return true;
end $$;

create or replace function it_test_private.create_fulfillment(p_checkout uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.it_test_checkouts; o public.orders; g public.musical_gifts; oid uuid:=gen_random_uuid(); gid uuid:=gen_random_uuid(); payload jsonb;
begin
 select * into c from public.it_test_checkouts where id=p_checkout for update;
 if not found or c.status<>'paid' or c.livemode is distinct from false or c.currency<>'eur' then raise exception 'it_test_not_paid'; end if;
 if c.fulfillment_order_id is not null then return c.fulfillment_order_id; end if;
 if c.order_snapshot is null then raise exception 'it_test_snapshot_missing'; end if;
 payload:=c.order_snapshot||jsonb_build_object('id',oid,'user_id',c.owner_id,'status','PAID','payment_status','PAID',
  'amount',c.amount_cents,'currency','EUR','is_preview',true,'sandbox_market','IT_TEST','payment_method','stripe_it_test',
  'created_at',now(),'updated_at',now(),'approved_lyric_id',null,'style_prompt',null,'final_prompt',null,
  'music_ready_at',null,'review_notification_sent',true,'voucher_code',null,'discount_applied',0,
  'pix_receipt_url',null,'pix_rejection_reason',null);
 o:=jsonb_populate_record(null::public.orders,payload);
 insert into public.orders select (o).*;
 if c.gift_snapshot is not null then
  payload:=c.gift_snapshot||jsonb_build_object('id',gid,'owner_id',c.owner_id,'is_test',true,'checkout_order_id',oid,
   'production_order_id',case when c.gift_snapshot->>'music_source'='new' then oid else null end,
   'status',case when c.gift_snapshot->>'music_source'='new' then 'PRODUCTION' else 'APPROVED_TEST' end,
   'amount_cents',c.amount_cents,'original_amount_cents',c.amount_cents,'voucher_discount_cents',0,'voucher_code',null,
   'details',coalesce(c.gift_snapshot->'details','{}'::jsonb)||jsonb_build_object('sandbox_currency','EUR','sandbox_market','IT_TEST'),'shipping_cents',0,'payment_confirmed_at',now(),'receipt_path',null,'approved_by',null,
   'public_token',encode(extensions.gen_random_bytes(32),'hex'),'public_alias',null,'lyric_cues','[]'::jsonb,
   'shipping_status','PENDING','tracking_code',null,'admin_message',null,'version',1,'created_at',now(),'updated_at',now(),
   'audio_duration_seconds',null,'stripe_session_id',null,'checkout_lease',null,'checkout_locked_until',null,'lyrics_generation_started_at',null);
  g:=jsonb_populate_record(null::public.musical_gifts,payload);
  insert into public.musical_gifts(id,owner_id,product,music_source,source_order_id,production_order_id,track_version,recipient_name,sender_name,dedication,occasion,theme,photo_data,details,has_card,duration_seconds,delivery_channel,available_from,status,plan_id,amount_cents,shipping_cents,receipt_path,payment_confirmed_at,approved_by,is_test,public_token,lyric_cues,shipping_status,tracking_code,admin_message,version,created_at,updated_at,checkout_order_id,audio_duration_seconds,stripe_session_id,lyrics_generation_started_at,original_amount_cents,voucher_discount_cents,voucher_code,checkout_lease,checkout_locked_until) values(g.id,g.owner_id,g.product,g.music_source,g.source_order_id,g.production_order_id,g.track_version,g.recipient_name,g.sender_name,g.dedication,g.occasion,g.theme,g.photo_data,g.details,g.has_card,g.duration_seconds,g.delivery_channel,g.available_from,g.status,g.plan_id,g.amount_cents,g.shipping_cents,g.receipt_path,g.payment_confirmed_at,g.approved_by,g.is_test,g.public_token,g.lyric_cues,g.shipping_status,g.tracking_code,g.admin_message,g.version,g.created_at,g.updated_at,g.checkout_order_id,g.audio_duration_seconds,g.stripe_session_id,g.lyrics_generation_started_at,g.original_amount_cents,g.voucher_discount_cents,g.voucher_code,g.checkout_lease,g.checkout_locked_until);
  -- Run the existing photo-preservation and ownership trigger on the new copy only.
  update public.orders set updated_at=now() where id=oid;
  insert into public.musical_gift_events(gift_id,event) values(gid,'stripe_it_test_confirmed');
 end if;
 update public.it_test_checkouts set fulfillment_order_id=oid,fulfillment_gift_id=case when c.gift_snapshot is null then null else gid end where id=c.id;
 return oid;
end $$;
revoke all on function it_test_private.create_fulfillment(uuid) from public,anon,authenticated;
grant execute on function it_test_private.create_fulfillment(uuid) to service_role;

create or replace function it_test_private.begin_checkout(p_order uuid, p_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.orders; g public.musical_gifts; plans text[]; items jsonb; total integer; n integer; c public.it_test_checkouts;
begin
 if p_owner is null or not public.has_role(p_owner,'admin') then raise exception 'it_test_forbidden'; end if;
 select * into o from public.orders where id=p_order and user_id=p_owner for update;
 if not found then raise exception 'it_test_forbidden'; end if;
 if o.payment_status <> 'PENDING' or o.status in ('CANCELLED','COMPLETED') or o.sandbox_market is not null then raise exception 'it_test_order_not_payable'; end if;
 if o.voucher_code is not null or coalesce(o.discount_applied,0) <> 0 then raise exception 'it_test_voucher_unavailable'; end if;
 update public.it_test_checkouts set status='abandoned', last_error='stale_pending' where order_id=p_order and status='pending' and created_at < now() - interval '5 minutes';
 if exists(select 1 from public.it_test_checkouts where order_id=p_order and status='paid') then raise exception 'it_test_already_paid'; end if;
 if exists(select 1 from public.it_test_checkouts where order_id=p_order and status in ('pending','open')) then raise exception 'it_test_checkout_open'; end if;
 select * into g from public.musical_gifts where checkout_order_id=p_order for update;
 if found then
  if g.owner_id<>p_owner or g.is_test or g.status<>'AWAITING_PAYMENT' or g.payment_confirmed_at is not null or g.stripe_session_id is not null
   or (g.checkout_locked_until is not null and g.checkout_locked_until > now()) then raise exception 'it_test_order_not_payable'; end if;
  if g.voucher_code is not null or g.voucher_discount_cents <> 0 then raise exception 'it_test_voucher_unavailable'; end if;
  if g.product='physical' or g.shipping_cents <> 0 then raise exception 'it_test_physical_unavailable'; end if;
  plans := array[g.plan_id];
  if g.product='short' and g.has_card then plans := array_append(plans,'gift_short_card'); end if;
 else
  if exists(select 1 from public.musical_gifts where production_order_id=p_order or source_order_id=p_order and status='AWAITING_PAYMENT') then raise exception 'it_test_order_not_payable'; end if;
  if coalesce(o.plan_id,'single') not like 'single%' or coalesce(o.is_preview,false) or coalesce(o.has_custom_lyric,false) then raise exception 'it_test_plan_unavailable'; end if;
  plans := array['music_full'];
 end if;
 select count(*), coalesce(sum(unit_amount),0), jsonb_agg(jsonb_build_object('plan_id',plan_id,'price_id',price_id,'unit_amount',unit_amount) order by plan_id)
  into n, total, items from public.it_test_catalog where plan_id = any(plans) and active and currency='eur' and not livemode;
 if n <> cardinality(plans) or total <= 0 then raise exception 'it_test_plan_unavailable'; end if;
 insert into public.it_test_checkouts(order_id,gift_id,owner_id,items,amount_cents,account_id,order_snapshot,gift_snapshot)
  values(p_order,g.id,p_owner,items,total,'acct_1UVMtHBI0iXvcrrH',to_jsonb(o),case when g.id is null then null else to_jsonb(g) end) returning * into c;
 -- The original order is a briefing template only. Never lock or mutate its payment.
 return jsonb_build_object('id',c.id,'items',c.items,'amount_cents',c.amount_cents,'currency',c.currency,'account_id',c.account_id);
end $$;


create or replace function it_test_private.apply_event(p_event_id text, p_type text, p_session text, p_checkout uuid, p_payment_status text,
 p_amount integer, p_currency text, p_livemode boolean, p_price_ids text[]) returns text
language plpgsql security definer set search_path='' as $$
declare c public.it_test_checkouts; inserted integer; outcome text; expected text[];
begin
 insert into public.it_test_webhook_events(event_id,event_type,session_id) values(p_event_id,p_type,p_session) on conflict do nothing;
 get diagnostics inserted = row_count;
 if inserted = 0 then return 'duplicate'; end if;
 select * into c from public.it_test_checkouts where stripe_session_id=p_session for update;
 if not found or c.id is distinct from p_checkout then raise exception 'it_test_session_not_attached';
 elsif p_type in ('checkout.session.completed','checkout.session.async_payment_succeeded') then
  select array_agg(x->>'price_id' order by x->>'price_id') into expected from jsonb_array_elements(c.items) x;
  if c.status='paid' then outcome := 'already_paid';
  elsif p_payment_status is distinct from 'paid' then outcome := 'not_paid';
  elsif p_livemode is distinct from false or p_currency is distinct from 'eur' or p_amount is distinct from c.amount_cents
   or (select array_agg(p order by p) from unnest(p_price_ids) p) is distinct from expected then
   if c.status='open' then update public.it_test_checkouts set status='failed', last_error='mismatch' where id=c.id; perform it_test_private.release_gift(c); end if;
   outcome := 'mismatch';
  elsif c.status <> 'open' then outcome := 'invalid_state';
  else
   update public.it_test_checkouts set status='paid', paid_at=now(), paid_event_id=p_event_id where id=c.id;
   perform it_test_private.create_fulfillment(c.id);
   outcome := 'paid';
  end if;
 elsif p_type in ('checkout.session.expired','checkout.session.async_payment_failed') then
  if c.status='open' then
   update public.it_test_checkouts set status=case when p_type='checkout.session.expired' then 'expired' else 'failed' end, last_error=p_type where id=c.id;
   perform it_test_private.release_gift(c);
   outcome := 'closed';
  else outcome := 'ignored'; end if;
 else outcome := 'ignored';
 end if;
 update public.it_test_webhook_events set result=outcome where event_id=p_event_id;
 return outcome;
end $$;

create or replace function it_test_private.guard_test_order() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and old.sandbox_market='IT_TEST' then
  if new.sandbox_market is distinct from old.sandbox_market or new.user_id is distinct from old.user_id
   or new.currency is distinct from old.currency or new.amount is distinct from old.amount
   or new.is_preview is distinct from true or new.payment_status is distinct from old.payment_status
   or new.payment_method is distinct from old.payment_method then raise exception 'it_test_order_immutable'; end if;
 elsif new.sandbox_market is not null and (tg_op='INSERT' or new.sandbox_market is distinct from old.sandbox_market) then
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'it_test_server_only'; end if;
 end if;
 return new;
end $$;
drop trigger if exists it_test_order_guard on public.orders;
create trigger it_test_order_guard before insert or update on public.orders for each row execute function it_test_private.guard_test_order();
create or replace function it_test_private.guard_test_gift() returns trigger language plpgsql set search_path='' as $$
begin
 if old.details->>'sandbox_market'='IT_TEST' and (new.is_test is distinct from true or new.owner_id is distinct from old.owner_id
  or new.details->>'sandbox_market' is distinct from 'IT_TEST' or new.details->>'sandbox_currency' is distinct from 'EUR'
  or new.amount_cents is distinct from old.amount_cents) then raise exception 'it_test_gift_immutable'; end if;
 return new;
end $$;
drop trigger if exists it_test_gift_guard on public.musical_gifts;
create trigger it_test_gift_guard before update on public.musical_gifts for each row execute function it_test_private.guard_test_gift();
revoke all on all functions in schema it_test_private from public,anon,authenticated;
revoke all on function public.it_test_begin_checkout(uuid,uuid),public.it_test_attach_session(uuid,uuid,text,timestamptz),public.it_test_abort_checkout(uuid,uuid,text),public.it_test_apply_event(text,text,text,uuid,text,integer,text,boolean,text[]) from public,anon,authenticated;
commit;
