create or replace function gift_private.friendly_link(p_name text,p_token text) returns text language sql immutable set search_path='' as $$
 select 'para-' || left(coalesce(nullif(trim(both '-' from regexp_replace(lower(translate(coalesce(p_name,''),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn')),'[^a-z0-9]+','-','g')),''),'voce'),32) || '-' || rtrim(translate(encode(decode(left(p_token,32),'hex'),'base64'),'+/','-_'),'=');
$$;
revoke all on function gift_private.friendly_link(text,text) from public,anon;
grant execute on function gift_private.friendly_link(text,text) to authenticated,service_role;
alter table public.musical_gifts add column public_alias text generated always as (gift_private.friendly_link(recipient_name,public_token)) stored;
create unique index musical_gifts_public_alias_idx on public.musical_gifts(public_alias);
CREATE OR REPLACE FUNCTION gift_private.public_gift(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('public_alias',g.public_alias,'recipient_name',g.recipient_name,'sender_name',g.sender_name,'dedication',g.dedication,'theme',g.theme,'photo_data',g.photo_data,
 'occasion',g.occasion,'audio_url',t.audio_url,'title',coalesce(o.song_title,l.title,'Criando Músicas'),'cover_url',o.cover_url,'lyrics',l.body,'lyric_cues',g.lyric_cues,'is_test',g.is_test,'has_card',g.has_card,'details',jsonb_build_object('card_design',g.details->>'card_design'),'background_data',b.image_data)
 from public.musical_gifts g join public.orders o on o.id=case when g.music_source='existing' then g.source_order_id else g.production_order_id end
 join public.tracks t on t.order_id=o.id and t.version=g.track_version and t.status='READY'
 left join public.lyrics l on l.id=o.approved_lyric_id
 left join public.gift_backgrounds b on b.id::text=g.details->>'background_id'
 where (g.public_token = p_token OR g.public_alias = p_token) and g.status='ACTIVE' and (g.is_test or g.payment_confirmed_at is not null)
 and (g.available_from is null or g.available_from<=now()) and o.user_id=g.owner_id and (g.is_test or not coalesce(o.is_preview,false)) and t.audio_url like 'https://%' and (g.music_source='existing' or l.is_approved=true);
$function$;
