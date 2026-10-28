import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {giftLyricText,isGiftToken} from './gift-link.ts';
import {giftUrl} from './gifts.ts';
import {giftShareLinks} from './gift-sharing.ts';
import {giftEntryHtml} from '../../scripts/gift-entry.mjs';
import {isMaintenanceExemptPath} from './maintenance.ts';
import {shouldBlockUpdate} from './flowGuard.ts';

const alias='para-bruno-'+ 'B'.repeat(22);
test('recipient lyrics omit production labels while preserving words, accents and stanza breaks',()=>{
 const text='[Verse]\nBruno, meu filho\n\n[Chorus]\nEu te amo\n[End]';
 assert.equal(giftLyricText(text),'Bruno, meu filho\n\nEu te amo');
 assert.equal(giftLyricText('[Verse 2]'), '');
 assert.equal(text.includes('[Verse]'),true);
});
test('friendly sharing preserves the private gift key and legacy links still work',()=>{
 assert(isGiftToken(alias));
 const url=giftUrl(alias,'https://criandomusicas.com.br');
 assert.equal(url,'https://criandomusicas.com.br/presente.html?para='+alias.slice(5));
 const message='🎁 Bruno, prepare o coração!\nAbra sua surpresa. 💜';
 const links=giftShareLinks(url,'Um presente para você',message);
 assert.equal(links.url,url);
  assert.equal(giftShareLinks(url+'&internal=private#preview','Gift').url,url);
 assert.equal(new URL(links.whatsapp).searchParams.get('text'),message+'\n\n'+url);
 assert(decodeURIComponent(links.email).includes(message));
 assert(!isGiftToken('para-bruno'));
 assert(!isGiftToken('para-bruno-'+ 'a'.repeat(6)));
 assert.throws(()=>giftShareLinks('https://criandomusicas.com.br/presente.html#qualquer','Gift'));
 assert.equal(giftUrl('a'.repeat(64),'https://criandomusicas.com.br'),'https://criandomusicas.com.br/presente.html?token='+'a'.repeat(64));
});
test('the gift entry has real static preview metadata with no personal content',()=>{
 const html=giftEntryHtml(readFileSync(new URL('../../index.html',import.meta.url),'utf8'));
 assert.match(html,/<meta property="og:title"[^>]*content="Uma surpresa musical/);
 assert.match(html,/<meta property="og:image" content="https:\/\/criandomusicas.com.br\/icons\/icon-512x512.png/);
 assert.match(html,/<meta name="robots"[^>]*content="noindex, nofollow"/);
 assert(!html.includes(alias));
});
test('public gift entry stays available in maintenance and does not interrupt playback with an app update',()=>{
 for(const path of ['/presente.html','/presente/'+alias,'/presente/'+'a'.repeat(64)]){
  assert(isMaintenanceExemptPath(path));assert(shouldBlockUpdate(path));
 }
 assert(!isMaintenanceExemptPath('/presente/para-bruno'));
});
