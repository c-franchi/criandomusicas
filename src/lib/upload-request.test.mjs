import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadRequest, musicUploadFetch } from './upload-request.ts';

test('a transport ignoring abort still times out and cannot leave ADM busy forever', async()=>{
  let aborted=false;
  await assert.rejects(()=>uploadRequest(signal=>{
    signal.addEventListener('abort',()=>{aborted=true});
    return new Promise(()=>{});
  },{timeoutMs:10}), /demorou/);
  assert.equal(aborted,true);
});
test('cancellation aborts a pending request; pre-aborted requests never start',async()=>{
  const c=new AbortController();
  const pending=uploadRequest(()=>new Promise(()=>{}),{signal:c.signal});
  c.abort();
  await assert.rejects(()=>pending,/cancelado/);
  let called=false;
  await assert.rejects(()=>uploadRequest(()=>{called=true;return Promise.resolve();},{signal:c.signal}),/cancelado/);
  assert.equal(called,false);
});
test('successful operations clear their timer without aborting later',async()=>{
  let signal;
  assert.equal(await uploadRequest(s=>{signal=s;return Promise.resolve(42);},{timeoutMs:10}),42);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(signal.aborted,false);
});
test('scoped fetch preserves headers, body and server errors without automatic mutation retries',async()=>{
  const c=new AbortController(), calls=[];
  const fetcher=musicUploadFetch(c.signal,async(url,options)=>{
    calls.push([url,options]);
    return new Response('{"message":"permission denied"}',{status:403,headers:{'content-type':'application/json'}});
  });
  const result=await fetcher('https://fixture.invalid/storage/v1/object/music-tracks/path',{method:'POST',headers:{Authorization:'Bearer fixture'},body:'audio'});
  assert.equal(result.status,403);
  assert.equal((await result.json()).message,'permission denied');
  assert.equal(calls.length,1);
  assert.equal(calls[0][1].headers.Authorization,'Bearer fixture');
});
test('cancel also releases a stalled response body',async()=>{
  const c=new AbortController();
  const fetcher=musicUploadFetch(c.signal,async()=>new Response(new ReadableStream({start(){}})));
  const pending=fetcher('https://fixture.invalid/rest/v1/tracks');
  await new Promise(resolve=>setTimeout(resolve,1));
  c.abort();
  await assert.rejects(()=>pending,/cancelado/);
});
