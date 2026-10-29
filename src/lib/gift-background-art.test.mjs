import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backgroundDesigns, backgroundPalettes, giftBackgroundSvg, backgroundPreviewUrl, renderGiftBackground } from './gift-background-art.ts';
test('all decorative backgrounds leave the center empty and contain no personal content or external resources',()=>{
 for(const design of backgroundDesigns)for(const palette of backgroundPalettes){
  const svg=giftBackgroundSvg(design,palette);assert(svg.startsWith('<svg'));assert(svg.includes('viewBox="0 0 720 960"'));
  assert(!/<(?:image|text|script|foreignObject)\b/.test(svg));assert(!/href=|https:/.test(svg));
  assert(!svg.includes('rect x="0"'));assert(!svg.includes('cx="360" cy="480"'));
  assert.equal(decodeURIComponent(backgroundPreviewUrl(design,palette).split(',').slice(1).join(',')),svg);
 }
});
test('unknown runtime palette data falls back to trusted colors instead of entering SVG markup',()=>{
 const svg=giftBackgroundSvg('flowers','\"><script>bad</script>');assert(!svg.includes('<script>'));assert(svg.includes('#db6ba7'));
});
test('the generator exports bounded transparent PNGs supported by the existing gallery',async()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document;let mime,attempts=0;
 globalThis.Image=class{set src(value){assert(value.startsWith('data:image/svg+xml,'));queueMicrotask(()=>this.onload());}};
 globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:type=>{mime=type;attempts++;return attempts===1?'data:image/png;base64,'+'A'.repeat(240000):'data:image/png;base64,AAAA';}})};
 try{assert.equal(await renderGiftBackground('flowers','rose'),'data:image/png;base64,AAAA');assert.equal(mime,'image/png');assert.equal(attempts,2);}
 finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
