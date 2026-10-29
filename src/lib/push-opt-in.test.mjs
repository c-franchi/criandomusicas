import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {transformSync} from 'esbuild';
let values=[],user={id:'buyer'},permission='default',requests=0,dbWrites=0,vapidCalls=0,order=[],toasts=[],saved=false;
globalThis.__hookReact={useState:()=>[values.shift(),()=>{}],useEffect:()=>{},useCallback:fn=>fn};
globalThis.__hookAuth=()=>({user});globalThis.__hookToast=()=>({toast:value=>toasts.push(value)});
globalThis.__pushDb={functions:{invoke:async()=>{vapidCalls++;order.push('vapid');return{data:{vapidPublicKey:'a'.repeat(87)},error:null};}},from:()=>({update:()=>({eq:()=>({neq:async()=>({error:null})})}),upsert:async()=>{dbWrites++;saved=true;return{error:null};}})};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{ready:Promise.resolve({pushManager:{subscribe:async()=>{order.push('subscribe');return{toJSON:()=>({endpoint:'https://fixture.invalid',keys:{p256dh:'x',auth:'y'}})};}}})}}});
globalThis.window={atob:()=> 'fixture-key'};
globalThis.Notification={get permission(){return permission;},requestPermission:async()=>{requests++;order.push('permission');return permission==='default'?'granted':permission;}};
const source=readFileSync(new URL('../hooks/usePushNotifications.tsx',import.meta.url),'utf8')
 .replace(/^import .* from "react";$/m,'const {useState,useEffect,useCallback}=globalThis.__hookReact;')
 .replace(/^import .*supabase.*$/m,'const supabase=globalThis.__pushDb;')
 .replace(/^import .*useAuth.*$/m,'const useAuth=globalThis.__hookAuth;')
 .replace(/^import .*useToast.*$/m,'const useToast=globalThis.__hookToast;');
const {usePushNotifications}=await import('data:text/javascript,'+encodeURIComponent(transformSync(source,{loader:'tsx',format:'esm'}).code));
function setup(){values=[true,false,false,'default'];user={id:'buyer'};permission='default';requests=0;dbWrites=0;vapidCalls=0;order=[];toasts=[];saved=false;}
test('notification permission starts in the click before any network wait and success follows persistence',async()=>{
 setup();const hook=usePushNotifications();assert.equal(requests,0);assert.equal(await hook.subscribe(),true);assert.equal(order[0],'permission');assert(saved);assert.equal(dbWrites,1);assert.equal(toasts.at(-1).title,'🔔 Notificações ativadas');
});
test('denied permission causes no subscription or database write and is not requested again',async()=>{
 setup();permission='denied';const hook=usePushNotifications();assert.equal(await hook.subscribe(),false);assert.equal(requests,0);assert.equal(dbWrites,0);assert.equal(order.includes('subscribe'),false);
});
test('signed-out users never request browser permission or write subscriptions',async()=>{
 setup();user=null;const hook=usePushNotifications();assert.equal(await hook.subscribe(),false);assert.equal(requests,0);assert.equal(dbWrites,0);
});
test('previously allowed permission is reused without another browser prompt',async()=>{
 setup();permission='granted';const hook=usePushNotifications();assert.equal(await hook.subscribe(),true);assert.equal(requests,0);assert.equal(dbWrites,1);
});
