import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {giftEntryHtml} from '../../scripts/gift-entry.mjs';
import {giftEntries,isPublicGiftPath} from './gift-entry-paths.mjs';
import {giftUrl} from './gifts.ts';
import {giftShareLinks} from './gift-sharing.ts';
import {giftNextStep} from './gift-next-step.ts';
import {isMaintenanceExemptPath} from './maintenance.ts';
import {setFlowBusy,shouldBlockUpdate} from './flowGuard.ts';
const source=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const token='para-bruno-'+'B'.repeat(22);
for(const [product,path] of Object.entries(giftEntries)) {
 test(`${product}: social card has one static 1200x630 PNG, a private entry and no homepage canonical`,()=>{
  const html=giftEntryHtml(source,product);
  assert.equal((html.match(/property="og:image" /g)||[]).length,1);
  assert(html.includes(`/social/gift-${product}-v2.png`));
  assert(html.includes('content="1200"'));assert(html.includes('content="630"'));
  assert(!html.includes('property="og:url"'));assert(!html.includes('rel="canonical"'));
  assert(html.includes('noindex, nofollow'));assert(!html.includes(token));
  const url=giftUrl(token,'https://criandomusicas.com.br',product);
  assert.equal(new URL(url).pathname,path);
  assert.equal(giftShareLinks(url,'Surpresa','🎁 Abra seu presente!').url,url);
  assert(isPublicGiftPath(path));assert(isMaintenanceExemptPath(path));
  assert(!shouldBlockUpdate(path));setFlowBusy(true);assert(shouldBlockUpdate(path));setFlowBusy(false);
 });
}
test('tracking prioritizes payment and release separately from audio production',()=>{
 assert.equal(giftNextStep('AWAITING_PAYMENT',false,false,false),'pay');
 assert.equal(giftNextStep('RECEIPT_SENT',false,false,false),'receipt');
 assert.equal(giftNextStep('PRODUCTION',false,false,false),'lyrics');
 assert.equal(giftNextStep('PRODUCTION',false,true,false),'audio');
 assert.equal(giftNextStep('PRODUCTION',false,true,true),'release');
 assert.equal(giftNextStep('ACTIVE',false,true,true),'share');
 assert.equal(giftNextStep('PAID',true,false,true),'release');
 assert.equal(giftNextStep('DRAFT',false,false,false),'draft');
 assert.equal(giftNextStep('CANCELLED',false,false,false),'cancel');
});
