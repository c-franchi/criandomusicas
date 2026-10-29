import { test } from 'node:test';import assert from 'node:assert/strict';
import Module from 'node:module';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
test('the real i18next bootstrap waits for country detection before choosing the initial translation language',async()=>{
 const previous={window:globalThis.window,document:globalThis.document};
 const store=new Map([['criandomusicas-language','pt-BR']]);
 globalThis.window={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async()=>new Response('loc=IT\n',{headers:{'content-type':'text/plain'}})};
 globalThis.document={querySelector:()=>null,documentElement:{lang:'pt-BR'}};
 const output=await build({entryPoints:[resolve(root,'src/lib/i18n.ts')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'translation-boundary',setup(b){
  b.onResolve({filter:/^i18next-http-backend$/},()=>({path:'backend',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:`class Backend{static type='backend';init(){}read(language,namespace,callback){callback(null,{testLanguage:language});}}module.exports=Backend;`}));
 }}]});
 try{
  const compiled=new Module(resolve(root,'locale-bootstrap-fixture.cjs'));compiled.filename=resolve(root,'locale-bootstrap-fixture.cjs');compiled.paths=Module._nodeModulePaths(root);compiled._compile(output.outputFiles[0].text,compiled.filename);
  const i18n=compiled.exports.default;
  if(!i18n.isInitialized)await new Promise(resolve=>i18n.on('initialized',resolve));
  assert.equal(i18n.language,'it');assert.equal(i18n.t('testLanguage'),'it');assert.equal(document.documentElement.lang,'it');
 }finally{globalThis.window=previous.window;globalThis.document=previous.document;}
});
