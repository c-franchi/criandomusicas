import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { z } from 'zod';
import * as helpers from '../../supabase/functions/_shared/giftResponse.ts';
let created=true,isTest=false,emailFails=false,requests=[],updates=[],rpcError=null;
globalThis.__responseHelpers=helpers;
globalThis.__responseZ=z;
globalThis.Deno={env:{get:()=> 'fixture-key'},serve:handler=>{globalThis.__responseHandler=handler;}};
globalThis.__responseDb={
 rpc:async()=>({data:{id:'reply',created},error:rpcError}),
 auth:{admin:{getUserById:async()=>({data:{user:{email:'owner@example.invalid'}},error:null})}},
 from:table=>{
  const q={select:()=>q,eq:()=>q,single:async()=>({data:table==='gift_responses'?{id:'reply',gift_id:'gift',owner_id:'stored-owner',emoji:'💜',message:'Obrigada!',rating:5}:{id:'gift',recipient_name:'Ana',is_test:isTest},error:null}),
   update:value=>{updates.push(value);return q;},then:resolve=>resolve({error:null})};return q;
 },
};
globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');requests.push(JSON.parse(options.body));return Response.json({id:'email'},{status:emailFails?503:200});};
const source=readFileSync(new URL('../../supabase/functions/gift-response/index.ts',import.meta.url),'utf8')
 .replace(/^import .*cors.*$/m,'const corsHeaders={};')
 .replace(/^import .*createClient.*$/m,'const createClient=()=>globalThis.__responseDb;')
 .replace(/^import .*z .*$/m,'const z=globalThis.__responseZ;')
 .replace(/^import .*giftResponseEmojis.*$/m,'const {giftResponseEmojis,giftResponseEmail,giftResponseMessageLimit}=globalThis.__responseHelpers;');
await import('data:text/javascript,'+encodeURIComponent(transformSync(source,{loader:'ts',format:'esm'}).code));
const body={token:'a'.repeat(64),requestId:'00000000-0000-4000-8000-000000000001',emoji:'💜',message:'Obrigada!',rating:5};
const invoke=input=>globalThis.__responseHandler(new Request('https://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}));
function reset(){created=true;isTest=false;emailFails=false;requests=[];updates=[];rpcError=null;}
test('email targets only the stored sender and contains the recipient response',async()=>{
 reset();const response=await invoke(body);assert.equal(response.status,200);assert.deepEqual(requests[0].to,['owner@example.invalid']);assert(requests[0].text.includes('💜 Obrigada!'));assert.equal(updates[0].email_status,'sent');
});
test('admin-test replies never send a real email',async()=>{
 reset();isTest=true;await invoke(body);assert.equal(requests.length,0);assert.equal(updates[0].email_status,'test_skipped');
});
test('idempotent reply retries do not send another notification email',async()=>{
 reset();created=false;await invoke(body);assert.equal(requests.length,0);assert.equal(updates.length,0);
});
test('a second response to the same gift is rejected without email',async()=>{
 reset();rpcError={code:'23505'};const response=await invoke(body);assert.equal(response.status,409);assert.equal((await response.json()).error,'already_replied');assert.equal(requests.length,0);
});
test('email provider failure retains successful stored response and reports failed delivery',async()=>{
 reset();emailFails=true;const response=await invoke(body);assert.equal((await response.json()).success,true);assert.equal(updates[0].email_status,'failed');
});
test('client cannot supply a different sender email or routing identity',async()=>{
 reset();const response=await invoke({...body,email:'attacker@example.invalid'});assert.equal(response.status,400);assert.equal(requests.length,0);
});