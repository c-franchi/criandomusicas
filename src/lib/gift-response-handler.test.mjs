import { emailFetch } from '../../supabase/functions/_shared/emailRetry.ts';
globalThis.__emailFetch=emailFetch;
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { z } from 'zod';
import * as helpers from '../../supabase/functions/_shared/giftResponse.ts';
let identity="stored-owner",emailState="failed",old=false;
let created=true,isTest=false,emailFails=false,requests=[],updates=[],rpcError=null;
globalThis.__responseHelpers=helpers;
globalThis.__responseZ=z;
globalThis.Deno={env:{get:()=> 'fixture-key'},serve:handler=>{globalThis.__responseHandler=handler;}};
globalThis.__responseDb={
 rpc:async()=>({data:{id:'reply',created},error:rpcError}),
 auth:{getUser:async()=>({data:{user:{id:identity}},error:null}),admin:{getUserById:async()=>({data:{user:{email:'owner@example.invalid'}},error:null})}},
 from:table=>{
  const q={select:()=>q,eq:()=>q,single:async()=>({data:table==='gift_responses'?{id:'reply',gift_id:'gift',owner_id:'stored-owner',email_status:emailState,created_at:old?'2020-01-01T00:00:00Z':new Date().toISOString(),emoji:'💜',message:'Obrigada!',rating:5}:{id:'gift',recipient_name:'Ana',is_test:isTest,status:'ACTIVE'},error:null}),
   update:value=>{updates.push(value);return q;},then:resolve=>resolve({error:null})};return q;
 },
};
globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');requests.push(JSON.parse(options.body));return Response.json({id:'email'},{status:emailFails?503:200});};
const source=readFileSync(new URL('../../supabase/functions/gift-response/index.ts',import.meta.url),'utf8')
 .replace(/^import .*emailFetch.*$/m,'const emailFetch=globalThis.__emailFetch;')
 .replace(/^import .*cors.*$/m,'const corsHeaders={};')
 .replace(/^import .*createClient.*$/m,'const createClient=()=>globalThis.__responseDb;')
 .replace(/^import .*z .*$/m,'const z=globalThis.__responseZ;')
 .replace(/^import .*giftResponseEmojis.*$/m,'const {giftResponseEmojis,giftResponseEmail,giftResponseMessageLimit}=globalThis.__responseHelpers;');
await import('data:text/javascript,'+encodeURIComponent(transformSync(source,{loader:'ts',format:'esm'}).code));
const body={token:'a'.repeat(64),requestId:'00000000-0000-4000-8000-000000000001',emoji:'💜',message:'Obrigada!',rating:5};
const invoke=input=>globalThis.__responseHandler(new Request('https://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture'},body:JSON.stringify(input)}));
function reset(){identity="stored-owner";emailState="failed";old=false;created=true;isTest=false;emailFails=false;requests=[];updates=[];rpcError=null;}
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
const retryBody={retryResponseId:'00000000-0000-4000-8000-000000000002'};
test('only the stored owner can retry a failed response email',async()=>{
 reset();identity='different-user';const result=await invoke(retryBody);assert.equal(result.status,404);assert.equal(requests.length,0);
 reset();const accepted=await invoke(retryBody);assert.equal(accepted.status,200);assert.deepEqual(requests[0].to,['owner@example.invalid']);
});
test('accepted notifications and expired retries do not send another email',async()=>{
 reset();emailState='sent';await invoke(retryBody);assert.equal(requests.length,0);
 reset();old=true;const result=await invoke(retryBody);assert.equal(result.status,409);assert.equal(requests.length,0);
});
