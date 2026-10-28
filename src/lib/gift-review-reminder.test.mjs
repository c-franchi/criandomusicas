import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {transformSync} from 'esbuild';
let gift=null,existing=false,pushes=[],updates=[];
globalThis.__reminderDb={from:table=>{const q={select:()=>q,eq:()=>q,not:()=>q,gte:()=>q,lte:()=>q,or:()=>q,
 maybeSingle:async()=>({data:table==='musical_gifts'?gift:existing?{id:'review'}:null,error:null}),
 update:v=>{updates.push(v);return q;},insert:()=>q,
 then:resolve=>resolve({data:table==='orders'?[{id:'order',user_id:'owner'}]:table==='push_subscriptions'?[{endpoint:'https://fixture.invalid',p256dh:'x',auth:'y'}]:[],error:null})};return q;}};
globalThis.__webPush={setVapidDetails:()=>{},sendNotification:async(sub,payload)=>pushes.push(JSON.parse(payload))};
globalThis.Deno={env:{get:()=> 'fixture'},serve:fn=>globalThis.__reminder=fn};
const source=readFileSync(new URL('../../supabase/functions/send-review-reminder/index.ts',import.meta.url),'utf8').replace(/^import .*createClient.*$/m,'const createClient=()=>globalThis.__reminderDb;').replace("await import('https://esm.sh/web-push@3.6.7')",'globalThis.__webPush');
await import('data:text/javascript,'+encodeURIComponent(transformSync(source,{loader:'ts',format:'esm'}).code));
async function invoke(g,review=false){gift=g;existing=review;pushes=[];updates=[];return globalThis.__reminder(new Request('https://fixture.invalid'));}
test('unreleased and admin-test gifts never receive a review reminder',async()=>{
 for(const g of [{id:'gift',status:'PRODUCTION',is_test:false},{id:'gift',status:'ACTIVE',is_test:true}]){await invoke(g);assert.equal(pushes.length,0);assert.equal(updates.length,0);}
});
test('released gifts point to their existing buyer review page',async()=>{
 await invoke({id:'gift',status:'ACTIVE',is_test:false});assert.equal(pushes.length,1);assert.equal(pushes[0].data.url,'/presentes/gift#avaliacao');
});
test('normal music reminders retain their route and existing review guard',async()=>{
 await invoke(null);assert.equal(pushes[0].data.url,'/pedido/order');
 await invoke(null,true);assert.equal(pushes.length,0);
});
