import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
let operations=[],sessions=[],key='fixture-key',rpcError=null;
globalThis.Deno={env:{get:()=>key}};
globalThis.__GiftTestStripe=class {
 constructor(){
  this.checkout={sessions:{
   retrieve:async id=>sessions.find(s=>s.id===id),
   expire:async id=>{operations.push(['expire',id]);},
   list:()=>({async *[Symbol.asyncIterator](){operations.push(['list']);yield* sessions;}})
  }};
 }
};
const source=readFileSync(new URL('../../supabase/functions/_shared/giftCheckout.ts',import.meta.url),'utf8').replace(/^import Stripe[^\n]+/,'const Stripe=globalThis.__GiftTestStripe;');
const {code}=transformSync(source,{loader:'ts',format:'esm'});
const {closeGiftCheckout}=await import('data:text/javascript,'+encodeURIComponent(code));
const client={rpc:async(name,args)=>{operations.push([name,args]);return {error:rpcError}}};
const owned=(id,status='open')=>({id,status,payment_status:status==='complete'?'paid':'unpaid',metadata:{order_id:'order',user_id:'owner'}});
function reset(){operations=[];sessions=[];key='fixture-key';rpcError=null;}
test('expire the owned open Stripe session before releasing the database lease',async()=>{
 reset();sessions=[owned('session')];await closeGiftCheckout(client,{stripe_session_id:'session',checkout_lease:'lease'},'order','owner');
 assert.equal(operations[0][0],'expire');assert.equal(operations[1][0],'gift_checkout_action');assert.equal(operations[1][1].p_session,'session');
});
test('a completed payment cannot be discarded to apply a voucher',async()=>{
 reset();sessions=[owned('session','complete')];await assert.rejects(()=>closeGiftCheckout(client,{stripe_session_id:'session',checkout_lease:'lease'},'order','owner'),/concluído/);assert.deepEqual(operations,[]);
});
test('another customer/order cannot have a checkout expired',async()=>{
 reset();sessions=[{...owned('session'),metadata:{order_id:'other',user_id:'owner'}}];await assert.rejects(()=>closeGiftCheckout(client,{stripe_session_id:'session',checkout_lease:'lease'},'order','owner'),/gift_order_mismatch/);assert.deepEqual(operations,[]);
});
test('reconcile older untracked sessions and ignore other customers',async()=>{
 reset();sessions=[owned('old'),{...owned('other'),metadata:{order_id:'other',user_id:'other'}}];await closeGiftCheckout(client,{stripe_session_id:null,checkout_lease:null},'order','owner',true);assert.deepEqual(operations,[['list'],['expire','old']]);
});
test('PIX-only setup and a pending creation lease do not require a Stripe scan',async()=>{
 reset();key=null;await closeGiftCheckout(client,{stripe_session_id:null,checkout_lease:null},'order','owner',true);key='fixture-key';await closeGiftCheckout(client,{stripe_session_id:null,checkout_lease:'lease'},'order','owner',true);assert.deepEqual(operations,[]);
});
test('a failed lease release is propagated, so the voucher cannot proceed',async()=>{
 reset();sessions=[owned('session','expired')];rpcError=Error('gift_checkout_busy');await assert.rejects(()=>closeGiftCheckout(client,{stripe_session_id:'session',checkout_lease:'lease'},'order','owner'),/gift_checkout_busy/);
});
