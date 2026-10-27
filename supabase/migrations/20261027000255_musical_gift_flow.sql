create schema if not exists gift_private;
revoke all on schema gift_private from public;
grant usage on schema gift_private to anon,authenticated;

create table if not exists public.musical_gifts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 product text not null check(product in ('digital','short','physical')),
 music_source text not null check(music_source in ('existing','new')),
 source_order_id uuid references public.orders(id) on delete restrict,
 production_order_id uuid unique references public.orders(id) on delete restrict,
 track_version integer not null default 1 check(track_version in (1,2)),
 recipient_name text not null default '' check(length(recipient_name)<=150),
 sender_name text not null default '' check(length(sender_name)<=150),
 dedication text not null default '' check(length(dedication)<=2000),
 occasion text not null default 'any' check(length(occasion)<=150),
 theme text not null default 'love' check(theme in ('christmas','love','birthday','family','birth','friendship','gratitude','tribute','wedding','any')),
 photo_data text check(photo_data is null or (octet_length(photo_data)<=245760 and photo_data ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
 details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object' and octet_length(details::text)<=20000),
 has_card boolean not null default true,
 duration_seconds integer check(duration_seconds in (15,30)),
 delivery_channel text not null default 'link' check(delivery_channel in ('link','whatsapp','email')),
 available_from timestamptz,
 status text not null default 'DRAFT' check(status in ('DRAFT','AWAITING_PAYMENT','RECEIPT_SENT','PAID','APPROVED_TEST','PRODUCTION','ACTIVE','CANCELLED')),
 plan_id text references public.pricing_config(id), amount_cents integer check(amount_cents>0),
 shipping_cents integer not null default 0 check(shipping_cents>=0),
 receipt_path text, payment_confirmed_at timestamptz, approved_by uuid references auth.users(id),
 is_test boolean not null default false,
 public_token text not null unique default encode(extensions.gen_random_bytes(32),'hex'),
 lyric_cues jsonb not null default '[]'::jsonb check(jsonb_typeof(lyric_cues)='array' and jsonb_array_length(lyric_cues)<=300),
 shipping_status text not null default 'PENDING' check(shipping_status in ('PENDING','PRINT_READY','SHIPPED','DELIVERED')),
 tracking_code text check(length(tracking_code)<=150),
 admin_message text check(length(admin_message)<=1000),
 version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists musical_gifts_owner_created on public.musical_gifts(owner_id,created_at desc);
create index if not exists musical_gifts_status on public.musical_gifts(status);
alter table public.musical_gifts enable row level security;
revoke all on public.musical_gifts from public,anon,authenticated;
grant select on public.musical_gifts to authenticated;
grant all on public.musical_gifts to service_role;
drop policy if exists "Owners and admins read gifts" on public.musical_gifts;
create policy "Owners and admins read gifts" on public.musical_gifts for select to authenticated using(owner_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'));
create or replace trigger musical_gifts_updated before update on public.musical_gifts for each row execute function public.update_updated_at_column();

create table if not exists public.musical_gift_events (
 id uuid primary key default gen_random_uuid(),gift_id uuid not null references public.musical_gifts(id) on delete cascade,
 event text not null,actor_id uuid references auth.users(id),created_at timestamptz not null default now()
);
create index if not exists musical_gift_events_gift on public.musical_gift_events(gift_id,created_at);
alter table public.musical_gift_events enable row level security;
revoke all on public.musical_gift_events from public,anon,authenticated;
grant select on public.musical_gift_events to authenticated;
grant all on public.musical_gift_events to service_role;
drop policy if exists "Owners and admins read gift history" on public.musical_gift_events;
create policy "Owners and admins read gift history" on public.musical_gift_events for select to authenticated using(exists(select 1 from public.musical_gifts g where g.id=gift_id));

create table if not exists public.gift_operations (
 id boolean primary key default true check(id),physical_enabled boolean not null default false,
 pickup_enabled boolean not null default false,shipping_enabled boolean not null default false,
 shipping_fee_cents integer check(shipping_fee_cents>=0),print_format text check(length(print_format)<=150),
 production_estimate text check(length(production_estimate)<=500),updated_at timestamptz not null default now()
);
alter table public.gift_operations enable row level security;
revoke all on public.gift_operations from public,anon,authenticated;
grant select on public.gift_operations to anon,authenticated;
grant update(physical_enabled,pickup_enabled,shipping_enabled,shipping_fee_cents,print_format,production_estimate) on public.gift_operations to authenticated;
grant all on public.gift_operations to service_role;
drop policy if exists "Read gift operation" on public.gift_operations;
create policy "Read gift operation" on public.gift_operations for select to anon,authenticated using(true);
drop policy if exists "Admins configure gift operation" on public.gift_operations;
create policy "Admins configure gift operation" on public.gift_operations for update to authenticated using(public.has_role((select auth.uid()),'admin')) with check(public.has_role((select auth.uid()),'admin'));
create or replace trigger gift_operations_updated before update on public.gift_operations for each row execute function public.update_updated_at_column();
insert into public.gift_operations(id) values(true) on conflict(id) do nothing;

-- Inactive placeholders, never offered as zero-priced purchases. Existing prices untouched.
insert into public.pricing_config(id,name,price_display,price_cents,credits,is_active,sort_order) values
 ('gift_digital_existing','Cartão digital — música existente','A definir',0,0,false,100),
 ('gift_digital_new','Música nova com cartão digital','A definir',0,0,false,101),
 ('gift_short_15','Música curta — até 15 segundos','A definir',0,0,false,102),
 ('gift_short_30','Música curta — até 30 segundos','A definir',0,0,false,103),
 ('gift_short_card','Adicional cartão digital para música curta','A definir',0,0,false,104),
 ('gift_physical_existing','Cartão físico — música existente','A definir',0,0,false,105),
 ('gift_physical_new','Cartão físico com música nova','A definir',0,0,false,106)
on conflict(id) do nothing;

create or replace function gift_private.save_gift(p_id uuid,p_data jsonb,p_expected_version integer default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts; uid uuid:=auth.uid(); v_id uuid:=coalesce(p_id,gen_random_uuid());
begin
 if uid is null then raise exception 'gift_auth_required'; end if;
 if octet_length(p_data::text)>280000 or jsonb_typeof(p_data)<>'object' then raise exception 'gift_invalid_data'; end if;
 select * into g from public.musical_gifts where id=v_id for update;
 if found then
  if g.owner_id<>uid then raise exception 'gift_forbidden'; end if;
  if g.status<>'DRAFT' then raise exception 'gift_locked'; end if;
  if g.version<>p_expected_version then raise exception 'gift_conflict'; end if;
 else
  if p_expected_version<>0 then raise exception 'gift_conflict'; end if;
  insert into public.musical_gifts(id,owner_id,product,music_source) values(v_id,uid,p_data->>'product',case when p_data->>'product'='short' then 'new' else p_data->>'music_source' end);
 end if;
 if nullif(p_data->>'source_order_id','') is not null and not exists(
  select 1 from public.orders o join public.tracks t on t.order_id=o.id
  where o.id=(p_data->>'source_order_id')::uuid and o.user_id=uid and not coalesce(o.is_preview,false)
    and t.status='READY' and t.audio_url is not null and t.version=coalesce((p_data->>'track_version')::integer,1)
 ) then raise exception 'gift_music_unavailable'; end if;
 update public.musical_gifts set product=p_data->>'product',music_source=case when p_data->>'product'='short' then 'new' else p_data->>'music_source' end,
 source_order_id=case when p_data->>'music_source'='existing' and p_data->>'product'<>'short' then nullif(p_data->>'source_order_id','')::uuid else null end,
 track_version=coalesce((p_data->>'track_version')::integer,1),recipient_name=coalesce(p_data->>'recipient_name',''),sender_name=coalesce(p_data->>'sender_name',''),
 dedication=coalesce(p_data->>'dedication',''),occasion=coalesce(p_data->>'occasion','any'),theme=coalesce(p_data->>'theme','love'),
 photo_data=nullif(p_data->>'photo_data',''),details=coalesce(p_data->'details','{}'::jsonb),
 has_card=case when p_data->>'product'='short' then coalesce((p_data->>'has_card')::boolean,false) else true end,
 duration_seconds=case when p_data->>'product'='short' then (p_data->>'duration_seconds')::integer else null end,
 delivery_channel=coalesce(p_data->>'delivery_channel','link'),available_from=nullif(p_data->>'available_from','')::timestamptz,
 version=version+case when p_expected_version=0 then 0 else 1 end where id=v_id;
 return v_id;
end $$;

create or replace function gift_private.gift_action(p_id uuid,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts; uid uuid:=auth.uid(); adm boolean; plan text; price integer; extra integer; ops public.gift_operations; oid uuid; cues jsonb; prev_time numeric:=-1; cue jsonb;
begin
 if uid is null then raise exception 'gift_auth_required'; end if;
 adm:=public.has_role(uid,'admin');
 select * into g from public.musical_gifts where id=p_id for update;
 if not found or (g.owner_id<>uid and not adm) then raise exception 'gift_forbidden'; end if;
 if p_action in ('submit','test') then
  if p_action='test' and (not adm or g.owner_id<>uid) then raise exception 'gift_forbidden'; end if;
  if g.status<>'DRAFT' then return jsonb_build_object('id',g.id,'production_order_id',g.production_order_id); end if;
  if btrim(g.recipient_name)='' or btrim(g.sender_name)='' or (g.has_card and btrim(g.dedication)='') then raise exception 'gift_incomplete'; end if;
  if g.product='short' and g.duration_seconds is null then raise exception 'gift_incomplete'; end if;
  if g.music_source='new' and (length(btrim(coalesce(g.details->>'story','')))<20 or btrim(coalesce(g.details->>'style',''))='' or btrim(coalesce(g.details->>'language',''))='') then raise exception 'gift_incomplete'; end if;
  if g.music_source='existing' and not exists(select 1 from public.orders o join public.tracks t on t.order_id=o.id where o.id=g.source_order_id and o.user_id=g.owner_id and not coalesce(o.is_preview,false) and t.status='READY' and t.version=g.track_version and t.audio_url is not null) then raise exception 'gift_music_unavailable'; end if;
  if g.product='physical' and g.available_from>now() then raise exception 'gift_physical_schedule_unavailable'; end if;
  if p_action='test' then
   update public.musical_gifts set is_test=true,status='APPROVED_TEST',version=version+1 where id=p_id;
  else
   plan:=case when g.product='short' then 'gift_short_'||g.duration_seconds::text else 'gift_'||g.product||'_'||g.music_source end;
   select coalesce(price_promo_cents,price_cents) into price from public.pricing_config where id=plan and is_active;
   if price is null or price<=0 then raise exception 'gift_price_unavailable'; end if;
   if g.product='short' and g.has_card then
    select coalesce(price_promo_cents,price_cents) into extra from public.pricing_config where id='gift_short_card' and is_active;
    if extra is null or extra<=0 then raise exception 'gift_price_unavailable'; end if;
    price:=price+extra;
   end if;
   extra:=0;
   if g.product='physical' then
    select * into ops from public.gift_operations where id=true;
    if not ops.physical_enabled or btrim(coalesce(ops.print_format,''))='' then raise exception 'gift_operation_unavailable'; end if;
    if g.details->>'fulfillment'='pickup' and ops.pickup_enabled then extra:=0;
    elsif g.details->>'fulfillment'='shipping' and ops.shipping_enabled and ops.shipping_fee_cents is not null then
     if length(btrim(coalesce(g.details->>'address','')))<20 then raise exception 'gift_address_required'; end if;
     extra:=ops.shipping_fee_cents;
    else raise exception 'gift_operation_unavailable'; end if;
   end if;
   if not exists(select 1 from public.pix_config where is_active=true and length(btrim(pix_key))>0) then raise exception 'gift_pix_unavailable'; end if;
   update public.musical_gifts set status='AWAITING_PAYMENT',plan_id=plan,amount_cents=price+extra,shipping_cents=extra,version=version+1 where id=p_id;
  end if;
 elsif p_action='receipt' then
  if g.owner_id<>uid or g.status not in ('AWAITING_PAYMENT','RECEIPT_SENT') then raise exception 'gift_locked'; end if;
  if p_data->>'path' not like uid::text||'/'||p_id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='pix-receipts' and name=p_data->>'path') then raise exception 'gift_invalid_receipt'; end if;
  update public.musical_gifts set status='RECEIPT_SENT',receipt_path=p_data->>'path',admin_message=null,version=version+1 where id=p_id;
 elsif p_action='cancel' then
  if g.status not in ('DRAFT','AWAITING_PAYMENT') then raise exception 'gift_locked'; end if;
  update public.musical_gifts set status='CANCELLED',version=version+1 where id=p_id;
 else
  if not adm then raise exception 'gift_forbidden'; end if;
  if p_action='confirm_payment' then
   if g.status in ('PAID','PRODUCTION','ACTIVE') and not g.is_test then return jsonb_build_object('id',g.id,'production_order_id',g.production_order_id); end if;
   if not coalesce((p_data->>'reviewed')::boolean,false) then raise exception 'gift_review_required'; end if;
   if g.status<>'RECEIPT_SENT' or g.is_test or g.amount_cents is null or g.receipt_path is null then raise exception 'gift_invalid_payment'; end if;
   update public.musical_gifts set status='PAID',payment_confirmed_at=now(),approved_by=uid,version=version+1 where id=p_id;
  elsif p_action='reject_payment' then
   if g.status<>'RECEIPT_SENT' or length(btrim(coalesce(p_data->>'message','')))=0 then raise exception 'gift_incomplete'; end if;
   update public.musical_gifts set status='AWAITING_PAYMENT',admin_message=left(p_data->>'message',1000),receipt_path=null,version=version+1 where id=p_id;
  elsif p_action='start_production' then
   if g.music_source<>'new' or g.status not in ('PAID','APPROVED_TEST','PRODUCTION') then raise exception 'gift_locked'; end if;
   if g.production_order_id is null then
    if coalesce(g.details->>'music_type','') not in ('homenagem','romantica','parodia','infantil') then raise exception 'gift_invalid_music_type'; end if;
    insert into public.orders(user_id,status,payment_status,amount,plan_id,music_type,music_style,emotion,target,tone,purpose,story,song_title,is_preview,instrumentation_notes)
    values(g.owner_id,'BRIEFING_COMPLETE',case when g.is_test then 'PENDING'::public.payment_status else 'PAID'::public.payment_status end,
      coalesce(g.amount_cents,0),coalesce(g.plan_id,'gift_test'),g.details->>'music_type',g.details->>'style',g.details->>'tone',g.recipient_name,g.details->>'tone','gift',
      concat('Presente para: ',g.recipient_name,E'\nRemetente: ',g.sender_name,E'\nOcasião: ',g.occasion,E'\nIdioma: ',g.details->>'language',E'\nRelação: ',g.details->>'relationship',E'\nHistória: ',g.details->>'story',E'\nSentimentos: ',g.details->>'feelings',E'\nObservações: ',g.details->>'notes',case when g.product='short' then E'\nDuração máxima: '||g.duration_seconds::text||' segundos. Entregar uma versão final dentro desse limite.' else '' end),
      'Presente — '||g.recipient_name,g.is_test,'Origem: presente musical '||g.id::text)
    returning id into oid;
    update public.musical_gifts set production_order_id=oid,status='PRODUCTION',version=version+1 where id=p_id;
   end if;
  elsif p_action='publish' then
   if g.status not in ('PAID','APPROVED_TEST','PRODUCTION','ACTIVE') or (not g.is_test and g.payment_confirmed_at is null) then raise exception 'gift_invalid_payment'; end if;
   oid:=case when g.music_source='existing' then g.source_order_id else g.production_order_id end;
   if not exists(select 1 from public.orders o join public.tracks t on t.order_id=o.id where o.id=oid and o.user_id=g.owner_id and (g.is_test or not coalesce(o.is_preview,false)) and t.status='READY' and t.version=g.track_version and t.audio_url like 'https://%') then raise exception 'gift_music_unavailable'; end if;
   if not coalesce((p_data->>'reviewed')::boolean,false) then raise exception 'gift_review_required'; end if;
   if g.product='short' and not coalesce((p_data->>'duration_checked')::boolean,false) then raise exception 'gift_duration_review_required'; end if;
   update public.musical_gifts set status='ACTIVE',version=version+1 where id=p_id;
  elsif p_action='revoke' then
   if g.status<>'ACTIVE' then raise exception 'gift_locked'; end if;
   update public.musical_gifts set status=case when g.is_test then 'APPROVED_TEST' else 'PAID' end,public_token=encode(extensions.gen_random_bytes(32),'hex'),shipping_status='PENDING',version=version+1 where id=p_id;
  elsif p_action='cues' then
   cues:=coalesce(p_data->'cues','[]'::jsonb);
   if jsonb_typeof(cues)<>'array' or jsonb_array_length(cues)>300 then raise exception 'gift_invalid_cues'; end if;
   for cue in select value from jsonb_array_elements(cues) loop
    if jsonb_typeof(cue->'time') is distinct from 'number' or coalesce(cue->>'text','')='' or length(cue->>'text')>500 then raise exception 'gift_invalid_cues'; end if;
    if (cue->>'time')::numeric<0 or (cue->>'time')::numeric>3600 or (cue->>'time')::numeric<prev_time then raise exception 'gift_invalid_cues'; end if;
    prev_time:=(cue->>'time')::numeric;
   end loop;
   update public.musical_gifts set lyric_cues=cues,version=version+1 where id=p_id;
  elsif p_action='print_ready' then
   if g.product<>'physical' or g.status<>'ACTIVE' or g.available_from>now() then raise exception 'gift_not_ready'; end if;
   if not coalesce((p_data->>'qr_checked')::boolean,false) then raise exception 'gift_qr_review_required'; end if;
   update public.musical_gifts set shipping_status='PRINT_READY',version=version+1 where id=p_id;
  elsif p_action='shipped' then
   if g.product<>'physical' or g.status<>'ACTIVE' or g.shipping_status<>'PRINT_READY' then raise exception 'gift_not_ready'; end if;
   update public.musical_gifts set shipping_status='SHIPPED',tracking_code=left(p_data->>'tracking',150),version=version+1 where id=p_id;
  elsif p_action='delivered' then
   if g.product<>'physical' or g.status<>'ACTIVE' or g.shipping_status not in ('PRINT_READY','SHIPPED') then raise exception 'gift_not_ready'; end if;
   update public.musical_gifts set shipping_status='DELIVERED',version=version+1 where id=p_id;
  else raise exception 'gift_invalid_action'; end if;
 end if;
 insert into public.musical_gift_events(gift_id,event,actor_id) values(p_id,p_action,uid);
 select * into g from public.musical_gifts where id=p_id;
 return jsonb_build_object('id',g.id,'production_order_id',g.production_order_id,'status',g.status);
end $$;

create or replace function gift_private.public_gift(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recipient_name',g.recipient_name,'sender_name',g.sender_name,'dedication',g.dedication,'theme',g.theme,'photo_data',g.photo_data,
 'occasion',g.occasion,'audio_url',t.audio_url,'title',coalesce(o.song_title,l.title,'Criando Músicas'),'cover_url',o.cover_url,'lyrics',l.body,'lyric_cues',g.lyric_cues,'is_test',g.is_test,'has_card',g.has_card)
 from public.musical_gifts g join public.orders o on o.id=case when g.music_source='existing' then g.source_order_id else g.production_order_id end
 join public.tracks t on t.order_id=o.id and t.version=g.track_version and t.status='READY'
 left join public.lyrics l on l.id=o.approved_lyric_id
 where length(p_token)=64 and g.public_token=p_token and g.status='ACTIVE' and (g.is_test or g.payment_confirmed_at is not null)
 and (g.available_from is null or g.available_from<=now()) and o.user_id=g.owner_id and (g.is_test or not coalesce(o.is_preview,false)) and t.audio_url like 'https://%';
$$;

revoke all on function gift_private.save_gift(uuid,jsonb,integer) from public,anon,authenticated;
revoke all on function gift_private.gift_action(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function gift_private.public_gift(text) from public,anon,authenticated;
grant execute on function gift_private.save_gift(uuid,jsonb,integer),gift_private.gift_action(uuid,text,jsonb) to authenticated;
grant execute on function gift_private.public_gift(text) to anon,authenticated;
create or replace function public.save_musical_gift(p_id uuid,p_data jsonb,p_expected_version integer default 0) returns uuid language sql security invoker set search_path='' as $$ select gift_private.save_gift(p_id,p_data,p_expected_version); $$;
create or replace function public.musical_gift_action(p_id uuid,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$ select gift_private.gift_action(p_id,p_action,p_data); $$;
create or replace function public.get_musical_gift(p_token text) returns jsonb language sql stable security invoker set search_path='' as $$ select gift_private.public_gift(p_token); $$;
revoke all on function public.save_musical_gift(uuid,jsonb,integer),public.musical_gift_action(uuid,text,jsonb),public.get_musical_gift(text) from public,anon,authenticated;
grant execute on function public.save_musical_gift(uuid,jsonb,integer),public.musical_gift_action(uuid,text,jsonb) to authenticated;
grant execute on function public.get_musical_gift(text) to anon,authenticated;
