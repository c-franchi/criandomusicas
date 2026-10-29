import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadAdminOrders} from './admin-order-list.ts';
import {lyricApprovalEvidence,giftAdminStage} from './gift-production-state.ts';
function fixture(count=90,fail='') {
 const orders=Array.from({length:count},(_,i)=>({id:'o'+i,user_id:'u'+i,status:'MUSIC_GENERATING',approved_lyric_id:'l'+i,audio_input_id:null,song_title:'Song '+i}));
 const data={orders,musical_gifts:[{id:'gift',production_order_id:'o0',checkout_order_id:'o0',track_version:2,product:'digital',music_source:'new'}],lyrics:orders.map((o,i)=>({id:'l'+i,order_id:o.id,title:'Approved '+i,is_approved:true,created_at:'2026-10-28'})),tracks:[{order_id:'o0',version:1,status:'READY',audio_url:'wrong'},{order_id:'o0',version:2,status:'READY',audio_url:'correct'}],profiles:orders.map(o=>({user_id:o.user_id,name:o.user_id})),audio_inputs:[]};
 const calls=[];
 const client={from(table){let field,ids;const b={select(){return b},order(){return b},in(f,v){field=f;ids=v;return b},then(resolve,reject){calls.push(table);return Promise.resolve({data:ids?data[table].filter(row=>ids.includes(row[field])):data[table],error:table===fail?Error('failed '+table):null}).then(resolve,reject)}};return b;}};
 return {client,data,calls};
}
test('90 orders need five batch reads instead of per-order requests; selected gift version is preserved',async()=>{
 const f=fixture();let base;
 const result=await loadAdminOrders(f.client,value=>{base=value;assert.equal(f.calls.length,2)});
 assert.equal(result.length,90);assert.equal(f.calls.length,5);
 assert.equal(base[0].gift.id,'gift');
 assert.equal(result[0].track_url,'correct');assert.equal(result[0].lyric_approval_state,'approved');
 assert.equal(result[89].user_name,'u89');
});
test('separate payment and production orders appear as one gift request',async()=>{
 const f=fixture(3);f.data.musical_gifts[0].checkout_order_id='o1';
 const result=await loadAdminOrders(f.client);assert.equal(result.length,2);assert(result.some(o=>o.id==='o0'));assert(!result.some(o=>o.id==='o1'));
});
test('critical errors surface; metadata failure still provides the basic list',async()=>{
 const f=fixture(3,'lyrics');let base;
 await assert.rejects(()=>loadAdminOrders(f.client,value=>base=value),/failed lyrics/);
 assert.equal(base.length,3);assert.equal(base[0].gift.id,'gift');
 const g=fixture(3,'orders');let emitted=false;
 await assert.rejects(()=>loadAdminOrders(g.client,()=>emitted=true),/failed orders/);assert.equal(emitted,false);
});
test('an order pointer or production status alone must not masquerade as a confirmed lyric approval',()=>{
 const order={id:'o',status:'MUSIC_GENERATING',approved_lyric_id:'l'};
 assert.equal(lyricApprovalEvidence(order,{id:'l',order_id:'o',is_approved:false}),'inconsistent');
 assert.equal(lyricApprovalEvidence(order,{id:'l',order_id:'other',is_approved:true}),'inconsistent');
 assert.equal(lyricApprovalEvidence(order,{id:'l',order_id:'o',is_approved:true}),'approved');
 assert.equal(lyricApprovalEvidence({...order,approved_lyric_id:null}),'pending');
});

test('payment and recorded approval inconsistencies have priority over production labels',()=>{
 assert.equal(giftAdminStage('AWAITING_PAYMENT',false,'approved',true),'pay');
 assert.equal(giftAdminStage('RECEIPT_SENT',false,'approved',true),'receipt');
 assert.equal(giftAdminStage('PRODUCTION',false,'inconsistent',false),'inconsistent');
 assert.equal(giftAdminStage('PRODUCTION',false,'approved',false),'audio');
 assert.equal(giftAdminStage('PRODUCTION',false,'approved',true),'release');
 assert.equal(giftAdminStage('ACTIVE',false,'approved',true),'released');
});
