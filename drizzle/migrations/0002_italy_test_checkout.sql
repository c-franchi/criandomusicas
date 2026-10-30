-- Isolated IT/EUR sandbox checkout. Rollback: docs/it-test-checkout.md (drop it_test_* objects and orders.sandbox_market).
create schema if not exists it_test_private;
revoke all on schema it_test_private from public, anon, authenticated;
grant usage on schema it_test_private to service_role;

alter table public.orders add column if not exists sandbox_market text;
comment on column public.orders.sandbox_market is 'Set only by the IT sandbox confirmation; non-null orders are test purchases excluded from real sales.';

create table public.it_test_catalog(
 plan_id text primary key,
 product_id text not null,
 price_id text not null unique,
 unit_amount integer not null check (unit_amount > 0),
 currency text not null default 'eur' check (currency = 'eur'),
 account_id text not null check (account_id = 'acct_1UVMtHBI0iXvcrrH'),
 livemode boolean not null default false check (livemode = false),
 active boolean not null default true
);
grant select on public.it_test_catalog to authenticated;
grant all on public.it_test_catalog to service_role;
alter table public.it_test_catalog enable row level security;
create policy "Admins read IT test catalog" on public.it_test_catalog for select to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.it_test_catalog(plan_id,product_id,price_id,unit_amount,account_id) values
 ('gift_short_15','cm_it_short_15','price_1UW1IzBI0iXvcrrHjJUx7MD3',299,'acct_1UVMtHBI0iXvcrrH'),
 ('gift_short_30','cm_it_short_30','price_1UW1JeBI0iXvcrrH903xlFET',499,'acct_1UVMtHBI0iXvcrrH'),
 ('music_full','cm_it_music_full','price_1UW1KyBI0iXvcrrHj1uN8OyX',999,'acct_1UVMtHBI0iXvcrrH'),
 ('gift_short_card','cm_it_card_addon','price_1UW1L3BI0iXvcrrHW0dQLM69',200,'acct_1UVMtHBI0iXvcrrH'),
 ('gift_digital_existing','cm_it_digital_existing','price_1UW1L8BI0iXvcrrHBK2qpU9l',299,'acct_1UVMtHBI0iXvcrrH'),
 ('gift_digital_new_15','cm_it_digital_15','price_1UW1LFBI0iXvcrrHGMuvyiSW',499,'acct_1UVMtHBI0iXvcrrH'),
 ('gift_digital_new_30','cm_it_digital_30','price_1UW1LLBI0iXvcrrHQli2Ahyc',699,'acct_1UVMtHBI0iXvcrrH'),
 ('gift_digital_new','cm_it_digital_full','price_1UW1LQBI0iXvcrrHKsa8hUxt',1199,'acct_1UVMtHBI0iXvcrrH');

create table public.it_test_checkouts(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id),
 gift_id uuid references public.musical_gifts(id),
 owner_id uuid not null,
 items jsonb not null,
 amount_cents integer not null check (amount_cents > 0),
 currency text not null default 'eur' check (currency = 'eur'),
 market text not null default 'IT' check (market = 'IT'),
 account_id text not null check (account_id = 'acct_1UVMtHBI0iXvcrrH'),
 livemode boolean not null default false check (livemode = false),
 status text not null default 'pending' check (status in ('pending','open','paid','failed','expired','abandoned')),
 stripe_session_id text unique,
 expires_at timestamptz,
 paid_at timestamptz,
 paid_event_id text,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index it_test_checkouts_one_active on public.it_test_checkouts(order_id) where status in ('pending','open','paid');
grant select on public.it_test_checkouts to authenticated;
grant all on public.it_test_checkouts to service_role;
alter table public.it_test_checkouts enable row level security;
create policy "Admin owners read IT test checkouts" on public.it_test_checkouts for select to authenticated using (owner_id = auth.uid() and public.has_role(auth.uid(),'admin'));

create table public.it_test_webhook_events(
 event_id text primary key,
 event_type text not null,
 session_id text,
 result text,
 received_at timestamptz not null default now()
);
grant all on public.it_test_webhook_events to service_role;
alter table public.it_test_webhook_events enable row level security;

create or replace function it_test_private.guard_checkout() returns trigger language plpgsql set search_path='' as $$
begin
 if new.order_id is distinct from old.order_id or new.gift_id is distinct from old.gift_id or new.owner_id is distinct from old.owner_id
  or new.items is distinct from old.items or new.amount_cents is distinct from old.amount_cents or new.currency is distinct from old.currency
  or new.market is distinct from old.market or new.account_id is distinct from old.account_id or new.livemode is distinct from old.livemode
  or (old.stripe_session_id is not null and new.stripe_session_id is distinct from old.stripe_session_id)
  or (old.status = 'paid' and new.status <> 'paid') then
  raise exception 'it_test_checkout_immutable';
 end if;
 new.updated_at := now();
 return new;
end $$;
create trigger it_test_checkouts_guard before update on public.it_test_checkouts for each row execute function it_test_private.guard_checkout();

create or replace function it_test_private.release_gift(c public.it_test_checkouts) returns void language sql security definer set search_path='' as $$
 update public.musical_gifts set checkout_lease=null, checkout_locked_until=null
 where c.gift_id is not null and id=c.gift_id and checkout_lease=c.id and payment_confirmed_at is null;
$$;

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
  if g.product='short' and g.has_card then plans := plans || 'gift_short_card'; end if;
 else
  if exists(select 1 from public.musical_gifts where production_order_id=p_order or source_order_id=p_order and status='AWAITING_PAYMENT') then raise exception 'it_test_order_not_payable'; end if;
  if coalesce(o.plan_id,'single') not like 'single%' or coalesce(o.is_preview,false) then raise exception 'it_test_plan_unavailable'; end if;
  plans := array['music_full'];
 end if;
 select count(*), coalesce(sum(unit_amount),0), jsonb_agg(jsonb_build_object('plan_id',plan_id,'price_id',price_id,'unit_amount',unit_amount) order by plan_id)
  into n, total, items from public.it_test_catalog where plan_id = any(plans) and active and currency='eur' and not livemode;
 if n <> cardinality(plans) or total <= 0 then raise exception 'it_test_plan_unavailable'; end if;
 insert into public.it_test_checkouts(order_id,gift_id,owner_id,items,amount_cents,account_id)
  values(p_order,g.id,p_owner,items,total,'acct_1UVMtHBI0iXvcrrH') returning * into c;
 if g.id is not null then update public.musical_gifts set checkout_lease=c.id, checkout_locked_until=now()+interval '5 minutes' where id=g.id; end if;
 return jsonb_build_object('id',c.id,'items',c.items,'amount_cents',c.amount_cents,'currency',c.currency,'account_id',c.account_id);
end $$;

create or replace function it_test_private.attach_session(p_id uuid, p_owner uuid, p_session text, p_expires timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare c public.it_test_checkouts;
begin
 select * into c from public.it_test_checkouts where id=p_id and owner_id=p_owner for update;
 if not found or c.status<>'pending' or p_session !~ '^cs_test_' or p_expires <= now() then raise exception 'it_test_checkout_busy'; end if;
 update public.it_test_checkouts set status='open', stripe_session_id=p_session, expires_at=p_expires where id=p_id;
 if c.gift_id is not null then update public.musical_gifts set checkout_locked_until=p_expires+interval '1 minute' where id=c.gift_id and checkout_lease=c.id; end if;
 return true;
end $$;

create or replace function it_test_private.abort_checkout(p_id uuid, p_owner uuid, p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.it_test_checkouts;
begin
 select * into c from public.it_test_checkouts where id=p_id and owner_id=p_owner for update;
 if not found or c.status<>'pending' then return; end if;
 update public.it_test_checkouts set status='abandoned', last_error=left(p_reason,200) where id=p_id;
 perform it_test_private.release_gift(c);
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
 if not found or c.id is distinct from p_checkout then outcome := 'unknown_session';
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
   if c.gift_id is not null then
    update public.musical_gifts set payment_confirmed_at=now(), checkout_lease=null, checkout_locked_until=null, version=version+1 where id=c.gift_id;
    insert into public.musical_gift_events(gift_id,event) values(c.gift_id,'stripe_it_test_confirmed');
   end if;
   update public.orders set payment_status='PAID', status=case when status in ('DRAFT','AWAITING_PAYMENT') then 'PAID'::public.order_status else status end,
    payment_method='stripe_it_test', sandbox_market='IT_TEST' where id=c.order_id;
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

revoke all on function it_test_private.guard_checkout(), it_test_private.release_gift(public.it_test_checkouts), it_test_private.begin_checkout(uuid,uuid), it_test_private.attach_session(uuid,uuid,text,timestamptz),
 it_test_private.abort_checkout(uuid,uuid,text), it_test_private.apply_event(text,text,text,uuid,text,integer,text,boolean,text[]) from public, anon;
grant execute on function it_test_private.begin_checkout(uuid,uuid), it_test_private.attach_session(uuid,uuid,text,timestamptz),
 it_test_private.abort_checkout(uuid,uuid,text), it_test_private.apply_event(text,text,text,uuid,text,integer,text,boolean,text[]) to service_role;

create or replace function public.it_test_begin_checkout(p_order uuid, p_owner uuid) returns jsonb language sql security invoker set search_path='' as $$ select it_test_private.begin_checkout(p_order,p_owner); $$;
create or replace function public.it_test_attach_session(p_id uuid, p_owner uuid, p_session text, p_expires timestamptz) returns boolean language sql security invoker set search_path='' as $$ select it_test_private.attach_session(p_id,p_owner,p_session,p_expires); $$;
create or replace function public.it_test_abort_checkout(p_id uuid, p_owner uuid, p_reason text) returns void language sql security invoker set search_path='' as $$ select it_test_private.abort_checkout(p_id,p_owner,p_reason); $$;
create or replace function public.it_test_apply_event(p_event_id text, p_type text, p_session text, p_checkout uuid, p_payment_status text, p_amount integer, p_currency text, p_livemode boolean, p_price_ids text[]) returns text language sql security invoker set search_path='' as $$ select it_test_private.apply_event(p_event_id,p_type,p_session,p_checkout,p_payment_status,p_amount,p_currency,p_livemode,p_price_ids); $$;
revoke all on function public.it_test_begin_checkout(uuid,uuid), public.it_test_attach_session(uuid,uuid,text,timestamptz), public.it_test_abort_checkout(uuid,uuid,text), public.it_test_apply_event(text,text,text,uuid,text,integer,text,boolean,text[]) from public, anon;
grant execute on function public.it_test_begin_checkout(uuid,uuid), public.it_test_attach_session(uuid,uuid,text,timestamptz), public.it_test_abort_checkout(uuid,uuid,text), public.it_test_apply_event(text,text,text,uuid,text,integer,text,boolean,text[]) to service_role;