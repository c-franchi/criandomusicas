import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';
import { lyricApprovalEvidence } from './gift-production-state.ts';

const fields = 'id,status,payment_status,payment_method,created_at,music_type,music_style,story,user_id,final_prompt,style_prompt,approved_lyric_id,is_instrumental,has_custom_lyric,instruments,solo_instrument,solo_moment,song_title,cover_url,pix_receipt_url,pix_rejection_reason,amount,purpose,emotion,voice_type,audio_input_id';
const giftFields = 'id,product,duration_seconds,music_source,is_test,recipient_name,track_version,checkout_order_id,production_order_id,status';
const check = <T extends {error: unknown}>(r: T): T => { if(r.error) throw r.error; return r; };
/** A bounded number of batched reads, instead of three requests for every order. */
export async function loadAdminOrders(client: SupabaseClient<Database>, onBase?: (orders: unknown[]) => void) {
  const [or, gr] = await Promise.all([
    client.from('orders').select(fields).order('created_at', {ascending:false}),
    client.from('musical_gifts').select(giftFields),
  ]);
  check(or); check(gr);
  const orders = or.data || [], gifts = gr.data || [];
  const giftMap = new Map(gifts.flatMap(g => [g.production_order_id,g.checkout_order_id].filter(Boolean).map(id => [id,g] as const)));
  const base = orders.map(o => ({...o,gift:giftMap.get(o.id)})).filter(o =>
    !o.gift?.production_order_id || o.id !== o.gift.checkout_order_id || o.id === o.gift.production_order_id);
  onBase?.(base);
  if(!orders.length) return [];
  async function batch(table: 'lyrics'|'tracks'|'profiles'|'audio_inputs', columns: string, field: string, ids: string[]) {
    const unique=[...new Set(ids.filter(Boolean))], result=[];
    // Small enough for URL limits; no concurrent per-order fan-out.
    for(let start=0;start<unique.length;start+=100) {
      const q=client.from(table) as unknown as {select:(columns:string)=>{in:(field:string,ids:string[])=>PromiseLike<{data:Record<string,any>[]|null;error:unknown}>}};
      const r=await q.select(columns).in(field,unique.slice(start,start+100));
      check(r); result.push(...(r.data || []));
    }
    return result;
  }
  const [lyrics,tracks,profiles,inputs]=await Promise.all([
    batch('lyrics','id,order_id,title,is_approved,created_at','order_id',orders.map(o=>o.id)),
    batch('tracks','order_id,audio_url,version,status','order_id',orders.map(o=>o.id)),
    batch('profiles','user_id,name,whatsapp','user_id',orders.map(o=>o.user_id)),
    batch('audio_inputs','id,storage_path','id',orders.map(o=>o.audio_input_id).filter(Boolean)),
  ]);
  const signed=new Map<string,string>();
  if(inputs.length) {
    const r=await client.storage.from('audio-inputs').createSignedUrls(inputs.map(i=>i.storage_path),3600);
    check(r);
    for(const row of r.data || []) if(row.path && row.signedUrl && !row.error) signed.set(row.path,row.signedUrl);
  }
  const lyricById=new Map(lyrics.map(l=>[l.id,l]));
  const latest=new Map();
  for(const l of lyrics) if(!latest.has(l.order_id) || l.created_at>latest.get(l.order_id).created_at) latest.set(l.order_id,l);
  const profileMap=new Map(profiles.map(p=>[p.user_id,p]));
  const inputMap=new Map(inputs.map(i=>[i.id,i]));
  const trackMap=new Map<string,typeof tracks>();
  for(const track of tracks) if(track.status==='READY') trackMap.set(track.order_id,[...(trackMap.get(track.order_id)||[]),track]);
  return base.map(o=>{
    const chosen=lyricById.get(o.approved_lyric_id), rows=trackMap.get(o.id)||[], profile=profileMap.get(o.user_id);
    const primary=o.gift?rows.find(t=>t.version===o.gift.track_version):rows.find(t=>t.version===1)||rows[0];
    return {...o,lyric_title:(chosen || latest.get(o.id))?.title || null,
      lyric_approval_state:lyricApprovalEvidence(o,chosen),
      track_url:primary?.audio_url || null, uploadedVersions:rows.filter(t=>t.audio_url && t.version!==null).map(t=>t.version),
      user_name:profile?.name || null,user_whatsapp:profile?.whatsapp || null,
      audio_input_url:signed.get(inputMap.get(o.audio_input_id)?.storage_path) || null};
  });
}
