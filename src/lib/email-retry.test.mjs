import {test} from 'node:test';import assert from 'node:assert/strict';
import {emailFetch} from '../../supabase/functions/_shared/emailRetry.ts';
test('transient provider failures retry with the same event key and bounded backoff',async()=>{
 let calls=0;const delays=[];
 const response=await emailFetch('https://provider.invalid',{headers:{'Idempotency-Key':'event/one'}},async(url,options)=>{
  calls++;assert.equal(options.headers['Idempotency-Key'],'event/one');return new Response('',{status:calls<3?503:200});
 },async ms=>delays.push(ms));
 assert.equal(response.status,200);assert.equal(calls,3);assert.deepEqual(delays,[500,1000]);
});
test('permanent provider errors are returned immediately',async()=>{
 let calls=0;const response=await emailFetch('https://provider.invalid',{},async()=>{calls++;return new Response('',{status:422});},async()=>assert.fail('No backoff'));
 assert.equal(response.status,422);assert.equal(calls,1);
});
test('network failures stop after three attempts',async()=>{
 let calls=0;await assert.rejects(emailFetch('https://provider.invalid',{},async()=>{calls++;throw Error('network');},async()=>{}));assert.equal(calls,3);
});
