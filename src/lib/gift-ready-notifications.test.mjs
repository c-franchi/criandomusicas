import { emailFetch } from '../../supabase/functions/_shared/emailRetry.ts';
globalThis.__emailFetch=emailFetch;
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
let gift=null,sent=false,requests=[],tables=[];
globalThis.Deno={env:{get:()=> 'fixture-key'},serve:handler=>{globalThis.__pushHandler=handler;}};
globalThis.__readyDb={
 auth:{getUser:async()=>({data:{user:{id:'admin'}},error:null}),admin:{getUserById:async()=>({data:{user:{email:'owner@example.invalid'}},error:null})}},
 rpc:async()=>({data:true,error:null}),
 from:table=>{
  tables.push(table);
  const q={select:()=>q,eq:()=>q,limit:()=>q,
   maybeSingle:async()=>({data:table==='musical_gifts'?gift:table==='profiles'?{name:'Buyer'}:sent?{id:'sent'}:null,error:null}),
   insert:async()=>{if(table==='musical_gift_events')sent=true;return {error:null};},
   then:resolve=>resolve({data:[],error:null}),
  };return q;
 },
};
globalThis.__FakeResend=class{emails={send:async payload=>{requests.push(payload);return{data:{id:'email'},error:null};}}};
globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');requests.push(JSON.parse(options.body));return Response.json({id:'email'});};
const emailSource=readFileSync(new URL('../../supabase/functions/send-music-ready-email/index.ts',import.meta.url),'utf8')
 .replace(/^import .*http\/server.ts.*$/m,'const serve=handler=>{globalThis.__emailHandler=handler;};')
 .replace(/^import .*resend@.*$/m,'const Resend=globalThis.__FakeResend;')
 .replace(/^import .*emailFetch.*$/m,'const emailFetch=globalThis.__emailFetch;')
 .replace(/^import .*supabase-js.*$/m,'const createClient=()=>globalThis.__readyDb;');
await import('data:text/javascript,'+encodeURIComponent(transformSync(emailSource,{loader:'ts',format:'esm'}).code));
const pushSource=readFileSync(new URL('../../supabase/functions/send-push-notification/index.ts',import.meta.url),'utf8')
 .replace(/^import .*emailFetch.*$/m,'const emailFetch=globalThis.__emailFetch;')
 .replace(/^import .*supabase-js.*$/m,'const createClient=()=>globalThis.__readyDb;')
 .replace(/import \{[\s\S]*?\} from "https:\/\/esm.sh\/@block65[^;]+;/,'const buildPushPayload=()=>{throw Error("No real push in tests");};');
await import('data:text/javascript,'+encodeURIComponent(transformSync(pushSource,{loader:'ts',format:'esm'}).code));
const fixture=(status='PRODUCTION',is_test=false)=>({id:'gift',owner_id:'owner',status,is_test,available_from:null});
const request=body=>new Request('https://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-key'},body:JSON.stringify(body)});
function reset(g){gift=g;sent=false;requests=[];tables=[];}
test('cached upload email calls cannot announce unreleased or test gifts',async()=>{
 for(const g of [fixture(),fixture('ACTIVE',true)]){
  reset(g);const r=await globalThis.__emailHandler(request({orderId:'order',userId:'owner'}));
  assert.equal((await r.json()).skipped,'gift_not_released');assert.equal(requests.length,0);
 }
});
test('released gift email goes to the stored owner and links to gift tracking, once',async()=>{
 reset(fixture('ACTIVE'));
 const body={orderId:'order',userId:'wrong',email:'wrong@example.invalid'};
 const r=await globalThis.__emailHandler(request(body));assert.equal(r.status,200);
 assert.deepEqual(requests[0].to,['owner@example.invalid']);
 assert.match(requests[0].subject,/presente musical foi liberado/);
 assert.match(requests[0].html,/\/presentes\/gift/);
 const retry=await globalThis.__emailHandler(request(body));assert.equal((await retry.json()).skipped,'already_sent');assert.equal(requests.length,1);
});
test('ordinary music ready emails retain the legacy delivery flow',async()=>{
 reset(null);const r=await globalThis.__emailHandler(request({orderId:'normal',email:'buyer@example.invalid'}));assert.equal(r.status,200);assert.equal(requests.length,1);assert.match(requests[0].subject,/pronta para ouvir/);
});
test('gift ready push is blocked before release, while lyric approval notifications remain available',async()=>{
 reset(fixture());const r=await globalThis.__pushHandler(request({order_id:'order',user_id:'owner',title:'Sua música está pronta!',body:'Ready'}));assert.equal((await r.json()).skipped,'gift_not_released');
 reset(fixture());const lyrics=await globalThis.__pushHandler(request({order_id:'order',user_id:'owner',title:'Letras prontas!',body:'Escolha uma letra'}));assert.equal(lyrics.status,200);assert(tables.includes('push_subscriptions'));assert.equal(requests.length,0);
});
