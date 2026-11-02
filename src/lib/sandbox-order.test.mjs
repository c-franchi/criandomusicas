import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isItalySandboxOrder} from '../../supabase/functions/_shared/sandboxOrder.ts';
const id='11111111-1111-4111-8111-111111111111';
function client(data,error=null){return {from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data,error})}}};}
test('notification classification uses persisted sandbox marker, leaves ordinary orders alone',async()=>{
 assert.equal(await isItalySandboxOrder(client({sandbox_market:'IT_TEST'}),id),true);
 assert.equal(await isItalySandboxOrder(client({sandbox_market:null}),id),false);
 assert.equal(await isItalySandboxOrder(client(null),id),false);
 assert.equal(await isItalySandboxOrder({},undefined),false);
});
test('database errors fail closed instead of allowing a sandbox notification',async()=>{
 await assert.rejects(()=>isItalySandboxOrder(client(null,Error('offline')),id),/offline/);
});
