import {test} from 'node:test';import assert from 'node:assert/strict';
import {countryLanguage,countryFromTrace,supportedBrowserLanguage,createLocaleController,detectAccessCountry} from './locale-selection.ts';
function fixture({saved={},country='IT',timezone='America/Sao_Paulo',languages=['pt-BR'],storageBlocked=false,fetcher}={}){
 const values=new Map(Object.entries(saved));let calls=0;
 const storage=()=>{if(storageBlocked)throw Error('blocked');return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
 const request=fetcher|| (async()=>new Response(`ip=private-test-ip\nloc=${country}\n`,{headers:{'content-type':'text/plain'}}));
 const controller=createLocaleController({storage,timezone:()=>timezone,languages:()=>languages,fetcher:async(...args)=>{calls++;return request(...args);}});
 return {controller,values,calls:()=>calls};
}
test('countries map to the four supported languages and unknown countries use fallback',()=>{
 for(const [country,language] of [['BR','pt-BR'],['PT','pt-BR'],['IT','it'],['ES','es'],['MX','es'],['UY','es'],['US','en'],['GB','en']])assert.equal(countryLanguage(country),language);
 assert.equal(countryLanguage('FR'),null);assert.equal(countryLanguage(null),null);
});
test('browser fallback scans past unsupported first preferences',()=>{
 assert.equal(supportedBrowserLanguage(['de-DE','it-IT']),'it');assert.equal(supportedBrowserLanguage(['fr-FR','en-US']),'en');assert.equal(supportedBrowserLanguage(['zh-CN']),null);
});
test('the parser returns only a country, ignoring IP fields and invalid/HTML responses',()=>{
 assert.equal(countryFromTrace('ip=private-test-ip\nloc=IT\n'),'IT');assert.equal(countryFromTrace('loc=BR\r\n'),'BR');
 for(const body of ['<html>fallback</html>','loc=123','loc=it','xloc=IT','A'.repeat(8193)])assert.equal(countryFromTrace(body),null);
});
test('country detection stays same-origin, credential-free and uncached',async()=>{
 let options,url;const result=await detectAccessCountry(async(u,o)=>{url=u;options=o;return new Response('loc=IT\n',{headers:{'content-type':'text/plain'}});});
 assert.equal(result,'IT');assert.equal(url,'/cdn-cgi/trace');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');
});
test('a native request deadline prevents a hanging lookup from blocking startup',async()=>{
 assert.equal(await detectAccessCountry(()=>new Promise(()=>{}),15),null);
 assert.equal(await detectAccessCountry(async()=>{throw Error('offline');}),null);
 assert.equal(await detectAccessCountry(async()=>new Response('<html>SPA fallback</html>',{headers:{'content-type':'text/html'}})),null);
});
test('first access uses country even if browser/timezone and an old automatic language cache disagree',async()=>{
 const f=fixture({saved:{'criandomusicas-language':'pt-BR'}});const next=await f.controller.resolve();assert.equal(next.language,'it');assert.equal(next.mode,'auto');assert.equal(next.region.code,'IT');
 assert(![...f.values.values()].some(v=>v.includes('private-test-ip')));assert(!f.values.has('criandomusicas-currency'));
});
test('legacy explicitly selected countries remain authoritative without an IP request',async()=>{
 const f=fixture({saved:{'criandomusicas-region':'BR','criandomusicas-language':'pt-BR'}});assert.equal((await f.controller.resolve()).language,'pt-BR');assert.equal(f.calls(),0);
});
test('manual language survives reload and country changes',async()=>{
 const f=fixture();f.controller.selectLanguage('es');assert.equal((await f.controller.resolve()).language,'es');assert.equal(f.calls(),0);
 const next=fixture({saved:Object.fromEntries(f.values),country:'US'});assert.equal((await next.controller.resolve()).language,'es');assert.equal(next.calls(),0);
});
test('manual country retains existing currency selection while automatic mode can be restored',async()=>{
 const f=fixture();f.controller.selectRegion('GB');assert.equal(f.values.get('criandomusicas-currency'),'GBP');assert.equal((await f.controller.resolve()).language,'en');
 assert.equal((await f.controller.automatic()).language,'it');assert.equal(f.controller.getSnapshot().mode,'auto');assert.equal(f.values.get('criandomusicas-currency'),'GBP');
 const next=fixture({saved:Object.fromEntries(f.values),country:'BR'});assert.equal((await next.controller.resolve()).language,'pt-BR');assert.equal(next.controller.getSnapshot().mode,'auto');
});
test('offline detection falls back to timezone, then browser, then Portuguese',async()=>{
 for(const [timezone,languages,expected] of [['Europe/Rome',['pt-BR'],'it'],['Unknown/Zone',['de-DE','es-ES'],'es'],['Unknown/Zone',['de-DE'],'pt-BR']]){
  const f=fixture({timezone,languages,fetcher:async()=>{throw Error('offline');}});assert.equal((await f.controller.resolve()).language,expected);
 }
});
test('a late lookup cannot override a manual choice made while it was pending',async()=>{
 let finish;const f=fixture({fetcher:()=>new Promise(resolve=>finish=resolve)});const pending=f.controller.resolve();f.controller.selectRegion('US');finish(new Response('loc=IT\n',{headers:{'content-type':'text/plain'}}));
 assert.equal((await pending).language,'en');assert.equal(f.controller.getSnapshot().mode,'manual');
});
test('multiple selectors share one lookup and all receive updates, including same-language region changes',async()=>{
 const f=fixture();await Promise.all([f.controller.resolve(),f.controller.resolve()]);assert.equal(f.calls(),1);
 let updates=0;const unsubscribe=f.controller.subscribe(()=>updates++);f.controller.selectRegion('BR');f.controller.selectRegion('PT');assert.equal(updates,2);assert.equal(f.controller.getSnapshot().region.code,'PT');unsubscribe();f.controller.selectRegion('BR');assert.equal(updates,2);
});
test('storage restrictions do not prevent detection or manual choices within the page',async()=>{
 const f=fixture({storageBlocked:true});assert.equal((await f.controller.resolve()).language,'it');f.controller.selectLanguage('en');assert.equal((await f.controller.resolve()).language,'en');
});
