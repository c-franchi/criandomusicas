CREATE OR REPLACE FUNCTION gift_private.public_gift(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('product',g.product,'public_alias',g.public_alias,'recipient_name',g.recipient_name,'sender_name',g.sender_name,'dedication',g.dedication,'theme',g.theme,'photo_data',g.photo_data,
 'occasion',g.occasion,'audio_url',t.audio_url,'title',coalesce(o.song_title,l.title,'Criando Músicas'),'cover_url',o.cover_url,'lyrics',l.body,'lyric_cues',g.lyric_cues,'is_test',g.is_test,'has_card',g.has_card,'details',jsonb_build_object('card_design',g.details->>'card_design'),'background_data',b.image_data)
 from public.musical_gifts g join public.orders o on o.id=case when g.music_source='existing' then g.source_order_id else g.production_order_id end
 join public.tracks t on t.order_id=o.id and t.version=g.track_version and t.status='READY'
 left join public.lyrics l on l.id=o.approved_lyric_id
 left join public.gift_backgrounds b on b.id::text=g.details->>'background_id'
 where (g.public_token = p_token OR g.public_alias = p_token) and g.status='ACTIVE' and (g.is_test or g.payment_confirmed_at is not null)
 and (g.available_from is null or g.available_from<=now()) and o.user_id=g.owner_id and (g.is_test or not coalesce(o.is_preview,false)) and t.audio_url like 'https://%' and (g.music_source='existing' or l.is_approved=true);
$function$;

CREATE OR REPLACE FUNCTION gift_private.gift_action(p_id uuid, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   plan:=case when g.product='short' then 'gift_short_'||g.duration_seconds::text else 'gift_'||g.product||'_'||g.music_source||case when g.music_source='new' and g.duration_seconds is not null then '_'||g.duration_seconds::text else '' end end;
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
    if g.details->>'fulfillment'='self_print' then extra:=0;
    elsif g.details->>'fulfillment'='pickup' and ops.pickup_enabled then extra:=0;
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
   if g.duration_seconds is not null and not coalesce((p_data->>'duration_checked')::boolean,false) then raise exception 'gift_duration_review_required'; end if;
   if g.duration_seconds is not null and (coalesce((p_data->>'audio_duration_seconds')::numeric,0)<=0 or (p_data->>'audio_duration_seconds')::numeric>gift_private.audio_limit(g.duration_seconds)+0.05) then raise exception 'gift_audio_duration_invalid'; end if;
   update public.musical_gifts set status='ACTIVE',audio_duration_seconds=case when duration_seconds is not null then (p_data->>'audio_duration_seconds')::numeric else null end,version=version+1 where id=p_id;
   if g.status <> 'ACTIVE' and not g.is_test and g.music_source='new' then
    update public.orders set music_ready_at=now(),review_notification_sent=false where id=coalesce(g.production_order_id,g.checkout_order_id);
   end if;
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
end $function$;


