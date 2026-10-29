import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {giftWizardSteps,giftStepKeys} from './gift-wizard-flow.ts';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('songs without cards skip only visual customization and delivery; cards retain full path',()=>{
 assert.deepEqual(giftWizardSteps(false),[0,1,4]);
 assert.deepEqual(giftWizardSteps(true),[0,1,2,3,4]);
 for(const card of [true,false]){
  const steps=giftWizardSteps(card);
  assert.equal(giftStepKeys[steps[0]],'choose');
  assert.equal(giftStepKeys[steps.at(-1)],'review');
  assert(steps.includes(1));
 }
});
// Compile the real summary, mocking only translation hooks to keep it deterministic.
const source=readFileSync(new URL('../components/gifts/flow/GiftBriefingSummary.tsx',import.meta.url),'utf8')
 .replace("import { useTranslation } from 'react-i18next';", "const useTranslation=()=>({t:(key,options)=>options?.defaultValue || key});")
 .replace("import { useBriefingTranslations } from '@/hooks/useBriefingTranslations';", "const useBriefingTranslations=()=>({styleOptions:[{id:'pop',label:'Pop'}]});");
const {outputFiles}=buildSync({stdin:{contents:source,loader:'tsx'},bundle:true,platform:'node',format:'cjs',packages:'external',external:['react/jsx-runtime'],write:false,jsx:'automatic'});
const module={exports:{}};
new Function('require','module','exports',outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const Summary=module.exports.default;
test('review retains exact story, relationships, feelings, language and instructions without AI rewriting',()=>{
 const gift={music_source:'new',sender_name:'Mamãe',occasion:'birthday',dedication:'Com todo meu amor',details:{style:'pop',tone:'emotional',language:'Italiano',relationship:'Meu filho Bruno',feelings:'Orgulho e gratidão',story:'Lembro do seu primeiro passo.\nNunca esqueça de onde veio.',notes:'Não mencionar idade; usar primeira pessoa.'}};
 const html=renderToStaticMarkup(React.createElement(Summary,{gift}));
 for(const value of ['Mamãe','Com todo meu amor','Pop',...Object.values(gift.details).filter(v=>!['pop','emotional'].includes(v))]) assert(html.includes(value),value);
 assert.match(html,/<details open=""/);
 assert.equal(gift.details.story,'Lembro do seu primeiro passo.\nNunca esqueça de onde veio.');
});
test('existing songs do not ask for a new musical briefing',()=>{
 const html=renderToStaticMarkup(React.createElement(Summary,{gift:{music_source:'existing',sender_name:'Ana',dedication:'Obrigada',details:{story:'OLD STORY',style:'pop'}}}));
 assert(html.includes('Obrigada'));assert(!html.includes('OLD STORY'));
});
test('all UI languages include new navigation and context guidance',()=>{
 for(const lang of ['pt-BR','en','es','it']){
  const j=JSON.parse(readFileSync(new URL(`../../public/locales/${lang}/home.json`,import.meta.url)));
  for(const key of ['checkStory','contextHelp','choices','storyHelp','editStory','deliveryOptions','readyActions','musicFiles','rate']) assert(j.giftFlow.simplify[key]);
 }
});
