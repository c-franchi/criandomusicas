import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { resolveGenerationLanguage } from '../../supabase/functions/_shared/generationLanguage.ts';
import { purchaseEmailCopy } from '../../supabase/functions/_shared/orderLanguageCopy.ts';

const requests=[];
globalThis.Deno={env:{get:()=> 'fixture'},serve:handler=>{globalThis.__purchaseHandler=handler;}};
globalThis.__purchaseLanguage={resolveGenerationLanguage,purchaseEmailCopy};
globalThis.__purchaseDb={from:table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='orders'?{language:'it'}:null,error:null})};return q;}};
globalThis.__PurchaseResend=class{emails={send:async payload=>{requests.push(payload);return{data:{id:'fake-email'},error:null};}}};
const source=readFileSync(new URL('../../supabase/functions/send-purchase-email/index.ts',import.meta.url),'utf8')
 .replace(/^import .*sandboxOrder.*$/m,'const isItalySandboxOrder=async()=>false;')
 .replace(/^import .*http\/server.ts.*$/m,'const serve=handler=>{globalThis.__purchaseHandler=handler;};')
 .replace(/^import .*resend@.*$/m,'const Resend=globalThis.__PurchaseResend;')
 .replace(/^import .*supabase-js.*$/m,'const createClient=()=>globalThis.__purchaseDb;')
 .replace(/^import .*generationLanguage.*$/m,'const {resolveGenerationLanguage}=globalThis.__purchaseLanguage;')
 .replace(/^import .*orderLanguageCopy.*$/m,'const {purchaseEmailCopy}=globalThis.__purchaseLanguage;');
await import('data:text/javascript,'+encodeURIComponent(transformSync(source,{loader:'ts',format:'esm'}).code));

test('purchase confirmation renders in the language stored on the order',async()=>{
 const response=await globalThis.__purchaseHandler(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({orderId:'order',email:'buyer@example.invalid',userName:'Buyer',purchaseType:'single',planName:'Singolo',amount:990,currency:'eur',paymentMethod:'card'})}));
 assert.equal(response.status,200);assert.equal(requests.length,1);
 assert.equal(requests[0].subject,'🎵 Conferma di acquisto - Singolo');
 assert.match(requests[0].html,/lang="it"/);assert.match(requests[0].html,/Dettagli dell’acquisto/);assert.match(requests[0].html,/La tua musica sarà consegnata entro 48 ore/);
 assert.doesNotMatch(requests[0].html,/Detalhes da Compra/);
});
