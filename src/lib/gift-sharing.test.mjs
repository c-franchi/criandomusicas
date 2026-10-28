import {test} from 'node:test';
import assert from 'node:assert/strict';
import {giftShareLinks} from './gift-sharing.ts';
const url='https://criandomusicas.com.br/presente/'+'a'.repeat(64);
const entry='https://criandomusicas.com.br/presente.html?token='+'a'.repeat(64);
test('social sharing uses only the individual gift link and preserves accents in text',()=>{
 const links=giftShareLinks(url+'?internal=private#preview','Um presente para você');
 assert.equal(links.url,entry);
 for(const network of ['whatsapp','facebook','telegram','x','email']){
  assert(links[network].includes(encodeURIComponent(entry)));
  assert(!links[network].includes('internal'));
 }
 assert(new URL(links.whatsapp).searchParams.get('text').includes('você'));
});
test('legacy gift sharing uses the static gift preview and keeps the private token',()=>{
 assert.equal(giftShareLinks(entry+'&internal=private','Gift').url,entry);
 assert.throws(()=>giftShareLinks('https://criandomusicas.com.br/presente.html?token=abc','Gift'));
});
test('checkout, admin and tracking URLs cannot accidentally be shared as gifts',()=>{
 for(const path of ['/admin/presentes','/presentes/abc','/checkout/123','/presente/abc'])assert.throws(()=>giftShareLinks('https://criandomusicas.com.br'+path,'Gift'));
 assert.throws(()=>giftShareLinks('javascript:alert(1)','Gift'));
});
