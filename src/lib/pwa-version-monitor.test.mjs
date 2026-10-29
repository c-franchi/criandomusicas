import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchAppVersion, APP_VERSION_CHECK_INTERVAL } from './pwa-version-monitor.ts';
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
 const host = new EventTarget(), doc = new EventTarget();
 const timers = new Map(), intervals = new Map(); let timerId=0;
 host.location={origin:'https://criandomusicas.com.br',reload:()=>assert.fail('must not reload')};
 host.navigator={};doc.visibilityState='visible';
 doc.querySelector=()=>({getAttribute:()=>'/assets/current.js'});
 host.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;};
 host.clearTimeout=id=>timers.delete(id);
 host.setInterval=(fn,ms)=>{const id=++timerId;intervals.set(id,{fn,ms});return id;};
 host.clearInterval=id=>intervals.delete(id);
 let entry='/assets/current.js',calls=0,alerts=0;
 host.fetch=async(url,options)=>{calls++;assert.equal(url,'/app-version.json');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>({entry})};};
 const start=()=>watchAppVersion(()=>alerts++,host,doc);
 return {host,doc,timers,intervals,start,setEntry:e=>entry=e,calls:()=>calls,alerts:()=>alerts};
}
test('checks immediately and every 15 seconds, reports each new version only once',async()=>{
 const f=fixture(),stop=f.start();await flush();assert.equal(f.calls(),1);assert.equal(f.alerts(),0);
 const [{fn,ms}]=f.intervals.values();assert.equal(ms,15000);assert.equal(ms,APP_VERSION_CHECK_INTERVAL);
 f.setEntry('/assets/next.js');fn();await flush();assert.equal(f.alerts(),1);
 fn();await flush();assert.equal(f.alerts(),1);
 f.setEntry('/assets/newer.js');fn();await flush();assert.equal(f.alerts(),2);stop();assert.equal(f.intervals.size,0);
});
test('resuming the tab and recovering connectivity check immediately, hidden tabs stay idle',async()=>{
 const f=fixture(),stop=f.start();await flush();
 f.doc.visibilityState='hidden';f.doc.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(f.calls(),1);
 f.doc.visibilityState='visible';
 for(const [target,event] of [[f.doc,'visibilitychange'],[f.host,'focus'],[f.host,'pageshow'],[f.host,'online']]){
  const before=f.calls();target.dispatchEvent(new Event(event));await flush();assert.equal(f.calls(),before+1);
 }
 stop();const before=f.calls();f.host.dispatchEvent(new Event('online'));await flush();assert.equal(f.calls(),before);
});
test('a stalled worker update does not block subsequent version fetches',async()=>{
 const f=fixture();let workerCalls=0;
 f.host.navigator.serviceWorker=Object.assign(new EventTarget(),{getRegistration:async()=>({update:()=>{workerCalls++;return new Promise(()=>{});}})});
 const stop=f.start();await flush();assert.equal(workerCalls,1);
 f.setEntry('/assets/next.js');[...f.intervals.values()][0].fn();await flush();assert.equal(f.calls(),2);assert.equal(f.alerts(),1);assert.equal(workerCalls,1);stop();
});
test('a timed-out version request releases the checker for retry',async()=>{
 const f=fixture(),normalFetch=f.host.fetch;let aborted=false;
 f.host.fetch=(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('timeout'));}));
 const stop=f.start();const [{fn,ms}]=f.timers.values();assert.equal(ms,8000);fn();await flush();assert(aborted);
 f.host.fetch=normalFetch;f.setEntry('/assets/next.js');f.host.dispatchEvent(new Event('online'));await flush();assert.equal(f.alerts(),1);stop();
});
test('controller changes verify the deployed entry without showing a false update banner',async()=>{
 const f=fixture();f.host.navigator.serviceWorker=Object.assign(new EventTarget(),{getRegistration:async()=>undefined});
 const stop=f.start();await flush();f.host.navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));await flush();assert.equal(f.alerts(),0);
 f.setEntry('/assets/next.js');f.host.navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));await flush();assert.equal(f.alerts(),1);stop();
});
test('cleanup cancels in-flight checks without reporting late results',async()=>{
 const f=fixture();let resolveResponse;f.host.fetch=()=>new Promise(resolve=>resolveResponse=resolve);
 const stop=f.start();stop();resolveResponse({ok:true,json:async()=>({entry:'/assets/late.js'})});await flush();assert.equal(f.alerts(),0);assert.equal(f.timers.size,0);
});

test('a new deployed version refreshes the worker immediately without the one-minute throttle',async()=>{
 const f=fixture();let calls=0;f.host.navigator.serviceWorker=Object.assign(new EventTarget(),{getRegistration:async()=>({update:async()=>{calls++;}})});
 const stop=f.start();await flush();assert.equal(calls,1);f.setEntry('/assets/new.js');[...f.intervals.values()][0].fn();await flush();assert.equal(calls,2);stop();
});
