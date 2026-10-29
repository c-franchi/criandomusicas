import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPwaInstaller} from './pwa-install.ts';
function fixture({supported=true,standalone=false,storage=new Map(),blockedStorage=false}={}) {
 const host=new EventTarget();
 if(supported)host.onbeforeinstallprompt=null;
 const display=new EventTarget();display.matches=standalone;
 host.matchMedia=()=>display;host.navigator={};
 Object.defineProperty(host,'localStorage',{get(){if(blockedStorage)throw Error('blocked');return {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};}});
 const controller=createPwaInstaller(host);
 return {host,controller,storage,display};
}
function offer(host,{outcome='accepted',failure=false,promptAction}={}) {
 let calls=0;const event=new Event('beforeinstallprompt',{cancelable:true});
 event.prompt=()=>{calls++;promptAction?.();return failure?Promise.reject(Error('native error')):Promise.resolve();};
 event.userChoice=Promise.resolve({outcome});host.dispatchEvent(event);
 return {event,calls:()=>calls};
}
test('the native event is retained before any page subscribes, then prompts once',async()=>{
 const {host,controller}=fixture();const native=offer(host);assert(native.event.defaultPrevented);assert.equal(controller.getSnapshot().status,'ready');
 let notified=0;const unsubscribe=controller.subscribe(()=>notified++);
 const result=await controller.install();assert.equal(result,'accepted');assert.equal(native.calls(),1);assert(notified>0);
 assert.equal(controller.getSnapshot().status,'installing');assert.equal(controller.getSnapshot().notificationsPending,false);
 assert.equal(await controller.install(),'unavailable');assert.equal(native.calls(),1);unsubscribe();controller.dispose();
});
test('only confirmed installation offers notifications, persisted until handled',async()=>{
 const {host,controller,storage}=fixture();offer(host);await controller.install();assert.equal(controller.getSnapshot().notificationsPending,false);
 host.dispatchEvent(new Event('appinstalled'));assert.equal(controller.getSnapshot().status,'installed');assert.equal(controller.getSnapshot().notificationsPending,true);
 controller.dispose();const next=fixture({storage});assert.equal(next.controller.getSnapshot().notificationsPending,true);
 next.controller.finishNotifications();assert.equal(next.controller.getSnapshot().notificationsPending,false);next.controller.dispose();
 const third=fixture({storage,standalone:true});assert.equal(third.controller.getSnapshot().notificationsPending,false);third.controller.dispose();
});
test('cancellation never claims installation or asks for notifications',async()=>{
 const {host,controller}=fixture();offer(host,{outcome:'dismissed'});assert.equal(await controller.install(),'dismissed');
 assert.equal(controller.getSnapshot().status,'waiting');assert.equal(controller.getSnapshot().notificationsPending,false);assert(controller.getSnapshot().dismissedUntil>Date.now());controller.dispose();
});
test('native errors remain recoverable and a new event allows retry',async()=>{
 const {host,controller}=fixture();offer(host,{failure:true});assert.equal(await controller.install(),'error');assert.equal(controller.getSnapshot().notificationsPending,false);
 const native=offer(host);await controller.install();assert.equal(native.calls(),1);controller.dispose();
});
test('installation during prompt resolution is never overwritten by accepted state',async()=>{
 const {host,controller}=fixture();offer(host,{promptAction:()=>host.dispatchEvent(new Event('appinstalled'))});await controller.install();assert.equal(controller.getSnapshot().status,'installed');controller.dispose();
});
test('unsupported browsers have no fake installer, but a real event overrides detection',async()=>{
 const {host,controller}=fixture({supported:false});assert.equal(controller.getSnapshot().status,'unsupported');assert.equal(await controller.install(),'unavailable');offer(host);assert.equal(controller.getSnapshot().status,'ready');controller.dispose();
});
test('standalone launch recognizes installation without prompting again',async()=>{
 const {host,controller}=fixture({standalone:true});const native=offer(host);assert.equal(controller.getSnapshot().status,'installed');assert.equal(await controller.install(),'unavailable');assert.equal(native.calls(),0);controller.dispose();
});
test('display-mode changes signal completed install, including storage-restricted clients',()=>{
 const {controller,display}=fixture({blockedStorage:true});display.matches=true;display.dispatchEvent(new Event('change'));assert.equal(controller.getSnapshot().status,'installed');assert.equal(controller.getSnapshot().notificationsPending,true);controller.finishNotifications();controller.dismiss();controller.dispose();
});
test('cleanup removes event listeners and cancelled prompts can be offered later',()=>{
 const {host,controller}=fixture();controller.dispose();offer(host);assert.equal(controller.getSnapshot().status,'waiting');
});
