import {test} from 'node:test';import assert from 'node:assert/strict';
import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {readFileSync} from 'node:fs';
import Module from 'node:module';import {build} from 'esbuild';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
globalThis.__giftCopy=JSON.parse(readFileSync(resolve(root,'public/locales/pt-BR/home.json'),'utf8'));
const out=await build({stdin:{resolveDir:root,contents:`export {default as Print} from './src/components/gifts/flow/GiftPrintCard.tsx'; export {default as Booklet} from './src/components/gifts/flow/GiftBooklet.tsx'; export {default as Digital} from './src/components/gifts/flow/GiftExperience.tsx'; export {default as Creator} from './src/components/gifts/flow/GiftBackgroundCreator.tsx'; export {default as Reset} from './src/components/RouteScrollReset.tsx';`,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external',loader:{'.css':'empty'},plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/^(react-i18next|react-router-dom|@\/hooks\/(useMusicalGifts|useFlowBusy))$|GiftShare$|GiftResponseForm$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path==='react-i18next'?`exports.useTranslation=()=>({t:key=>key.split('.').reduce((d,k)=>d?.[k],globalThis.__giftCopy)||key});`:a.path==='react-router-dom'?`exports.useLocation=()=>globalThis.__route;exports.Link=()=>null;`:a.path.includes('useMusicalGifts')?`exports.useGiftBackgrounds=()=>({data:[]});`:a.path.includes('useFlowBusy')?`exports.useFlowBusy=()=>{};`:`exports.default=()=>null;`}));
 b.onResolve({filter:/^react$/},a=>a.importer.endsWith('RouteScrollReset.tsx')?{path:'scroll-react',namespace:'fixture-react'}:null);
 b.onLoad({filter:/.*/,namespace:'fixture-react'},()=>({loader:'js',contents:`exports.useLayoutEffect=(fn,deps)=>{globalThis.__scrollDeps=deps;globalThis.__scrollCleanup=fn();};`}));
 b.onResolve({filter:/^@\//},a=>b.resolve(resolve(root,'src',a.path.slice(2)),{kind:a.kind,resolveDir:root}));
}}]});
const compiled=new Module(resolve(root,'gift-brand-fixture.cjs'));compiled.filename=resolve(root,'gift-brand-fixture.cjs');compiled.paths=Module._nodeModulePaths(root);compiled._compile(out.outputFiles[0].text,compiled.filename);
const ui=compiled.exports;
const gift={recipient_name:'Bruno',sender_name:'Mamãe',dedication:'Eu te amo',public_token:'a'.repeat(64),details:{card_design:'flowers'},theme:'family',photo_data:'https://example.com/photo.jpg',has_card:false};
globalThis.window={location:{origin:'https://criandomusicas.com.br',href:'https://criandomusicas.com.br/presente/private'}};
test('digital and single print cards include the logo and site without replacing the personal photo',()=>{
 for(const [component,props] of [[ui.Digital,{data:gift,preview:true}],[ui.Print,{gift}]]){
  const html=renderToStaticMarkup(React.createElement(component,props));assert(html.includes('gift-brand-mark'));assert(html.includes('criandomusicas.com.br</span>'));assert(html.includes('/icons/icon-192x192.png'));assert(html.includes('https://example.com/photo.jpg'));assert(html.includes('Eu te amo'));
 }
});
test('all four booklet panels carry the shared signature while keeping the QR',()=>{
 const html=renderToStaticMarkup(React.createElement(ui.Booklet,{gift,paper:'a4'}));assert.equal((html.match(/class="gift-brand-mark /g)||[]).length,4);assert(html.includes('gift-booklet-qr'));assert(html.includes('data-side="outside"'));assert(html.includes('data-side="inside"'));
});
test('the admin creator makes a decorative illustration preview, with a separate clear text area',()=>{
 const html=renderToStaticMarkup(React.createElement(ui.Creator,{busy:false,onCreate:async()=>{}}));assert(html.includes('Criar um fundo decorativo'));assert(html.includes('data:image/svg+xml'));assert(html.includes('Espaço livre para nomes e mensagem'));assert(!html.includes('https://example.com/photo.jpg'));
});
function scrollFixture(hash=''){
 const calls=[];let observer;
 globalThis.window={scrollTo:args=>calls.push(['top',args]),setTimeout:()=>7,clearTimeout:()=>{}};
 globalThis.__route={pathname:'/termos',hash};globalThis.document={getElementById:()=>null,body:{}};
 globalThis.MutationObserver=class{constructor(fn){this.run=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}};
 ui.Reset();return {calls,getObserver:()=>observer};
}
test('new routes scroll immediately to the top without depending on query-string form state',()=>{
 const f=scrollFixture();assert.equal(f.calls[0][0],'top');assert.deepEqual(f.calls[0][1],{top:0,left:0,behavior:'instant'});assert.deepEqual(globalThis.__scrollDeps,['/termos','']);
});
test('lazy section targets are followed after mounting, and the observer cleans up',()=>{
 const f=scrollFixture('#processo');const observer=f.getObserver();assert(observer);
 globalThis.document.getElementById=id=>id==='processo'?{scrollIntoView:args=>f.calls.push(['anchor',args])}:null;
 observer.run();assert.equal(f.calls.at(-1)[0],'anchor');assert(observer.disconnected);globalThis.__scrollCleanup();
});
