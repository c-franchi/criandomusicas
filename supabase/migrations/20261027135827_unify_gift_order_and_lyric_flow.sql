alter table public.tracks add column if not exists duration_seconds numeric;
-- New gifts use the existing order, checkout and customer lyric approval pipeline.
alter table public.musical_gifts add column if not exists checkout_order_id uuid unique references public.orders(id);
alter table public.musical_gifts add column if not exists audio_duration_seconds numeric;
alter table public.musical_gifts add column if not exists stripe_session_id text unique;
update public.musical_gifts set checkout_order_id=production_order_id where production_order_id is not null and checkout_order_id is null;

create or replace function gift_private.ensure_gift_order(p_gift uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts; oid uuid;
begin
 select * into g from public.musical_gifts where id=p_gift for update;
 if g.checkout_order_id is not null then return g.checkout_order_id; end if;
 if g.status not in ('AWAITING_PAYMENT','PAID','APPROVED_TEST','PRODUCTION') then raise exception 'gift_locked'; end if;
 if g.music_source='existing' and g.is_test then return null; end if;
 if g.music_source='new' and coalesce(g.details->>'music_type','') not in ('homenagem','romantica','parodia','infantil') then raise exception 'gift_invalid_music_type'; end if;
 insert into public.orders(user_id,status,payment_status,amount,plan_id,music_type,music_style,emotion,target,tone,purpose,story,song_title,is_preview,instrumentation_notes,music_structure,has_monologue)
 values(g.owner_id,case when g.is_test then 'BRIEFING_COMPLETE'::public.order_status when g.payment_confirmed_at is not null then 'PAID'::public.order_status else 'AWAITING_PAYMENT'::public.order_status end,
 case when g.payment_confirmed_at is not null then 'PAID'::public.payment_status else 'PENDING'::public.payment_status end,
 coalesce(g.amount_cents,0),coalesce(g.plan_id,'gift_test'),coalesce(g.details->>'music_type','homenagem'),g.details->>'style',g.details->>'tone',g.recipient_name,g.details->>'tone','gift',
 concat('Presente para: ',g.recipient_name,E'\nRemetente: ',g.sender_name,E'\nOcasião: ',g.occasion,E'\nIdioma: ',g.details->>'language',E'\nRelação: ',g.details->>'relationship',E'\nHistória: ',g.details->>'story',E'\nSentimentos: ',g.details->>'feelings',E'\nObservações: ',g.details->>'notes',case when g.product='short' then E'\nMÚSICA CURTA: no máximo '||g.duration_seconds||' segundos, nunca acima de 40s. Letra curta, sem repetir refrão e sem introdução ou solo.' else '' end),
 'Presente — '||g.recipient_name,g.is_test,'Origem: presente musical '||g.id,
 case when g.product='short' then 'verse' else 'verse,chorus' end,false) returning id into oid;
 update public.musical_gifts set checkout_order_id=oid,production_order_id=case when music_source='new' then oid else null end,status=case when music_source='new' and (is_test or payment_confirmed_at is not null) then 'PRODUCTION' else status end,version=version+1 where id=p_gift;
 return oid;
end $$;
revoke all on function gift_private.ensure_gift_order(uuid) from public,anon,authenticated;

create or replace function gift_private.short_lyric_valid(p_body text,p_seconds integer) returns boolean
language sql immutable set search_path='' as $$
 with cleaned as(select btrim(regexp_replace(coalesce(p_body,''),'\[[^\]]*\]','','g')) as body)
 select body<>'' and cardinality(regexp_split_to_array(body,'\s+'))<=case when p_seconds<=15 then 20 else 40 end
 and (select count(*) from regexp_split_to_table(body,E'\n') line where btrim(line)<>'')<=case when p_seconds<=15 then 4 else 6 end from cleaned;
$$;
revoke all on function gift_private.short_lyric_valid(text,integer) from public,anon,authenticated;

create or replace function gift_private.guard_gift_lyric() returns trigger
language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts;
begin
 select * into g from public.musical_gifts where production_order_id=new.order_id;
 if not found then return new; end if;
 if not g.is_test and g.payment_confirmed_at is null then raise exception 'gift_invalid_payment'; end if;
 if g.product='short' and not gift_private.short_lyric_valid(new.body,g.duration_seconds) then raise exception 'gift_lyric_too_long'; end if;
 return new;
end $$;
revoke all on function gift_private.guard_gift_lyric() from public,anon,authenticated;
create or replace trigger gift_lyric_length before insert or update of body,is_approved on public.lyrics for each row execute function gift_private.guard_gift_lyric();

create or replace function gift_private.sync_gift_order() returns trigger
language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts;
begin
 select * into g from public.musical_gifts where checkout_order_id=new.id or production_order_id=new.id for update;
 if not found then return new; end if;
 if new.user_id<>g.owner_id or (not g.is_test and (new.amount is distinct from g.amount_cents or new.plan_id is distinct from g.plan_id)) then raise exception 'gift_order_mismatch'; end if;
 if new.payment_status='PAID' and old.payment_status is distinct from new.payment_status and not coalesce(public.has_role(auth.uid(),'admin'),false) and not (coalesce(auth.jwt()->>'role','')='service_role' and g.payment_confirmed_at is not null) then raise exception 'gift_payment_forbidden'; end if;
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
revoke all on function gift_private.sync_gift_order() from public,anon,authenticated;
create or replace trigger gift_order_sync before update on public.orders for each row execute function gift_private.sync_gift_order();

create or replace function gift_private.guard_gift_track() returns trigger
language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts;
begin
 if new.status<>'READY' then return new; end if;
 select * into g from public.musical_gifts where production_order_id=new.order_id;
 if not found then return new; end if;
 if g.product='short' and (coalesce(new.duration_seconds,0)<=0 or new.duration_seconds>least(g.duration_seconds,40)+0.05) then raise exception 'gift_audio_duration_invalid'; end if;
 if not g.is_test and g.payment_confirmed_at is null then raise exception 'gift_invalid_payment'; end if;
 if not exists(select 1 from public.orders o join public.lyrics l on l.id=o.approved_lyric_id and l.order_id=o.id and l.is_approved where o.id=new.order_id) then raise exception 'gift_lyrics_approval_required'; end if;
 return new;
end $$;
revoke all on function gift_private.guard_gift_track() from public,anon,authenticated;
create or replace trigger gift_track_approval before insert or update of status,audio_url on public.tracks for each row execute function gift_private.guard_gift_track();


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
  if g.status<>'DRAFT' then return jsonb_build_object('id',g.id,'production_order_id',g.production_order_id,'checkout_order_id',g.checkout_order_id); end if;
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
  perform gift_private.ensure_gift_order(p_id);
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
   if g.status in ('PAID','PRODUCTION','ACTIVE') and not g.is_test then return jsonb_build_object('id',g.id,'production_order_id',g.production_order_id,'checkout_order_id',g.checkout_order_id); end if;
   if not coalesce((p_data->>'reviewed')::boolean,false) then raise exception 'gift_review_required'; end if;
   if g.status<>'RECEIPT_SENT' or g.is_test or g.amount_cents is null or g.receipt_path is null then raise exception 'gift_invalid_payment'; end if;
   update public.musical_gifts set status='PAID',payment_confirmed_at=now(),approved_by=uid,version=version+1 where id=p_id;
  elsif p_action='reject_payment' then
   if g.status<>'RECEIPT_SENT' or length(btrim(coalesce(p_data->>'message','')))=0 then raise exception 'gift_incomplete'; end if;
   update public.musical_gifts set status='AWAITING_PAYMENT',admin_message=left(p_data->>'message',1000),receipt_path=null,version=version+1 where id=p_id;
  elsif p_action='start_production' then
   if g.music_source<>'new' or g.status not in ('PAID','APPROVED_TEST','PRODUCTION') then raise exception 'gift_locked'; end if;
   perform gift_private.ensure_gift_order(p_id);
  elsif p_action='publish' then
   if g.status not in ('PAID','APPROVED_TEST','PRODUCTION','ACTIVE') or (not g.is_test and g.payment_confirmed_at is null) then raise exception 'gift_invalid_payment'; end if;
   oid:=case when g.music_source='existing' then g.source_order_id else g.production_order_id end;
   if not exists(select 1 from public.orders o join public.tracks t on t.order_id=o.id where o.id=oid and o.user_id=g.owner_id and (g.is_test or not coalesce(o.is_preview,false)) and t.status='READY' and t.version=g.track_version and t.audio_url like 'https://%') then raise exception 'gift_music_unavailable'; end if;
   if g.music_source='new' and not exists(select 1 from public.orders o join public.lyrics l on l.id=o.approved_lyric_id and l.order_id=o.id and l.is_approved where o.id=oid) then raise exception 'gift_lyrics_approval_required'; end if;
   if not coalesce((p_data->>'reviewed')::boolean,false) then raise exception 'gift_review_required'; end if;
   if g.product='short' and not coalesce((p_data->>'duration_checked')::boolean,false) then raise exception 'gift_duration_review_required'; end if;
   if g.product='short' and (coalesce((p_data->>'audio_duration_seconds')::numeric,0)<=0 or (p_data->>'audio_duration_seconds')::numeric>least(g.duration_seconds,40)+0.05) then raise exception 'gift_audio_duration_invalid'; end if;
   update public.musical_gifts set status='ACTIVE',audio_duration_seconds=case when product='short' then (p_data->>'audio_duration_seconds')::numeric else null end,version=version+1 where id=p_id;
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
 return jsonb_build_object('id',g.id,'production_order_id',g.production_order_id,'checkout_order_id',g.checkout_order_id,'status',g.status);
end $$;


create or replace function gift_private.public_gift(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recipient_name',g.recipient_name,'sender_name',g.sender_name,'dedication',g.dedication,'theme',g.theme,'photo_data',g.photo_data,
 'occasion',g.occasion,'audio_url',t.audio_url,'title',coalesce(o.song_title,l.title,'Criando Músicas'),'cover_url',o.cover_url,'lyrics',l.body,'lyric_cues',g.lyric_cues,'is_test',g.is_test,'has_card',g.has_card)
 from public.musical_gifts g join public.orders o on o.id=case when g.music_source='existing' then g.source_order_id else g.production_order_id end
 join public.tracks t on t.order_id=o.id and t.version=g.track_version and t.status='READY'
 left join public.lyrics l on l.id=o.approved_lyric_id
 where length(p_token)=64 and g.public_token=p_token and g.status='ACTIVE' and (g.is_test or g.payment_confirmed_at is not null)
 and (g.available_from is null or g.available_from<=now()) and o.user_id=g.owner_id and (g.is_test or not coalesce(o.is_preview,false)) and t.audio_url like 'https://%' and (g.music_source='existing' or l.is_approved=true);
$$;


alter table public.musical_gifts add column if not exists lyrics_generation_started_at timestamptz;
create or replace function gift_private.claim_gift_lyrics(p_order_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts;
begin
 select * into g from public.musical_gifts where production_order_id=p_order_id for update;
 if not found or (not g.is_test and g.payment_confirmed_at is null) then raise exception 'gift_invalid_payment'; end if;
 if exists(select 1 from public.lyrics where order_id=p_order_id) or g.lyrics_generation_started_at>now()-interval '6 minutes' then return false; end if;
 update public.musical_gifts set lyrics_generation_started_at=now() where id=g.id;
 return true;
end $$;
revoke all on function gift_private.claim_gift_lyrics(uuid) from public,anon,authenticated;
grant usage on schema gift_private to service_role;
grant execute on function gift_private.claim_gift_lyrics(uuid) to service_role;
create or replace function public.claim_gift_lyrics(p_order_id uuid) returns boolean language sql security invoker set search_path='' as $$ select gift_private.claim_gift_lyrics(p_order_id); $$;
revoke all on function public.claim_gift_lyrics(uuid) from public,anon,authenticated;
grant execute on function public.claim_gift_lyrics(uuid) to service_role;

-- Only the verified Stripe backend may record its confirmation; ordinary credits/vouchers cannot mark a gift paid.
create or replace function gift_private.confirm_gift_stripe(p_order_id uuid,p_session text,p_amount integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare g public.musical_gifts;
begin
 select * into g from public.musical_gifts where checkout_order_id=p_order_id for update;
 if not found or g.is_test or g.amount_cents is distinct from p_amount or length(coalesce(p_session,''))<10 then raise exception 'gift_invalid_payment'; end if;
 if g.stripe_session_id=p_session and g.payment_confirmed_at is not null then return true; end if;
 if g.status not in ('AWAITING_PAYMENT','RECEIPT_SENT') then raise exception 'gift_locked';end if;
 update public.musical_gifts set stripe_session_id=p_session,payment_confirmed_at=now(),version=version+1 where id=g.id;
 insert into public.musical_gift_events(gift_id,event) values(g.id,'stripe_confirmed');
 return true;
end $$;
revoke all on function gift_private.confirm_gift_stripe(uuid,text,integer) from public,anon,authenticated;
grant execute on function gift_private.confirm_gift_stripe(uuid,text,integer) to service_role;
create or replace function public.confirm_gift_stripe(p_order_id uuid,p_session text,p_amount integer) returns boolean language sql security invoker set search_path='' as $$ select gift_private.confirm_gift_stripe(p_order_id,p_session,p_amount); $$;
revoke all on function public.confirm_gift_stripe(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.confirm_gift_stripe(uuid,text,integer) to service_role;
