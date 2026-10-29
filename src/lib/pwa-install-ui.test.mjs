import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import Module,{createRequire} from 'node:module';import {build} from 'esbuild';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const copy=JSON.parse(readFileSync(resolve(root,'public/locales/pt-BR/common.json'),'utf8'));
globalThis.__installUI={status:'ready',notificationsPending:false};
const output=await build({stdin:{contents:"export {default} from './src/pages/Install.tsx'; export {PostInstallNotifications, default as InstallPopup} from './src/components/PwaInstallPrompt.tsx';",resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external',plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/^(@\/hooks\/usePwaInstall|@\/hooks\/useAuth|@\/hooks\/usePushNotifications|@\/components\/PwaInstallPrompt|@\/components\/PushNotificationPrompt|@\/components\/ui\/dialog|react-i18next|react-router-dom)$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',resolveDir:root,contents:
  a.path==='react-i18next'?`exports.useTranslation=()=>({t:key=>key.split('.').reduce((d,k)=>d?.[k],globalThis.__installCopy)||key});`:
  a.path==='react-router-dom'?`const React=require('react');exports.useLocation=()=>({pathname:globalThis.__installPath||'/install',search:''});exports.Link=({to,children,...p})=>React.createElement('a',{href:to,...p},children);`:
  a.path==='@/components/ui/dialog'?`const React=require('react');exports.Dialog=({open,children})=>open?React.createElement('section',{role:'dialog'},children):null;for(const key of ['DialogContent','DialogHeader','DialogTitle','DialogDescription'])exports[key]=({children,className})=>React.createElement('div',{className},children);`:
  a.path.includes('usePwaInstall')?`exports.usePwaInstall=()=>({...globalThis.__installUI,install:()=>{throw Error('No native UI in SSR tests')}});`:
  a.path.includes('usePushNotifications')?`exports.usePushNotifications=()=>globalThis.__pushUI;`:
  a.path.includes('useAuth')?`exports.useAuth=()=>({user:{id:'fixture'}});`:
  `const React=require('react');exports.PostInstallNotifications=()=>React.createElement('div',null,'post-install-notifications');exports.NotificationToggle=()=>React.createElement('div',null,'manual-notification-settings');`}));
 b.onResolve({filter:/^@\//},a=>b.resolve(resolve(root,'src',a.path.slice(2)),{kind:a.kind,resolveDir:root}));
}}]});
globalThis.__installCopy=copy;
const compiled=new Module(resolve(root,'install-ui-fixture.cjs'));compiled.filename=resolve(root,'install-ui-fixture.cjs');compiled.paths=Module._nodeModulePaths(root);compiled._compile(output.outputFiles[0].text,compiled.filename);const Page=compiled.exports.default;
const markup=(status,pending=false)=>{globalThis.__installUI={status,notificationsPending:pending};return renderToStaticMarkup(React.createElement(Page));};
test('ready installation shows the real button, with no browser-menu walkthrough',()=>{
 const html=markup('ready');assert(html.includes('Instalar Agora'));assert(!html.includes('post-install-notifications'));assert(!html.includes('três pontinhos'));assert(!html.includes('Abra o menu'));assert(!html.includes('No iPhone/iPad'));
});
test('accepted-but-incomplete install never shows success or notification setup',()=>{
 const html=markup('installing');assert(html.includes('Aguardando a confirmação'));assert(!html.includes('App Instalado!'));assert(!html.includes('post-install-notifications'));
});
test('confirmed installation shows the follow-up notification offer',()=>{
 const html=markup('installed',true);assert(html.includes('App Instalado!'));assert(html.includes('post-install-notifications'));assert(!html.includes('Instalar Agora'));
});
test('unsupported browsers cannot offer a fake install action',()=>{
 const html=markup('unsupported');assert(html.includes('não disponibiliza instalação direta'));assert(!html.includes('Instalar Agora'));assert(!html.includes('post-install-notifications'));
});

test('unsupported notifications can be dismissed without a dead-end invitation',()=>{
 globalThis.__installUI={status:'installed',notificationsPending:true};globalThis.__pushUI={isSubscribed:false,isSupported:false,permission:'default'};
 const html=renderToStaticMarkup(React.createElement(compiled.exports.PostInstallNotifications));
 assert(html.includes('não estão disponíveis'));assert(html.includes('Agora não'));assert(!html.includes('Ativar notificações'));
});

const popup=(state={},path='/')=>{
 globalThis.localStorage={getItem:()=>globalThis.__consentDone?'{}':null};
 globalThis.__installPath=path;
 globalThis.__installUI={status:'ready',notificationsPending:false,dismissedUntil:0,...state};
 return renderToStaticMarkup(React.createElement(compiled.exports.InstallPopup));
};
test('ready native installer opens a visible popup after any cookie choice, including on /install',()=>{
 globalThis.__consentDone=true;
 for(const path of ['/','/dashboard','/install']){
  const html=popup({},path);assert(html.includes('role="dialog"'));assert(html.includes('Leve suas músicas com você'));assert(html.includes('Instalar Agora'));assert(html.includes('Agora não'));assert(!html.includes('Abra o menu'));
 }
});
test('popup respects privacy choice banner and seven-day dismissal',()=>{
 globalThis.__consentDone=false;assert.equal(popup(),'');
 globalThis.__consentDone=true;assert.equal(popup({dismissedUntil:Date.now()+86400000}),'');
});
test('popup does not offer a nonexistent installer or interrupt pending/complete installation',()=>{
 globalThis.__consentDone=true;
 for(const status of ['waiting','unsupported','prompting','installing','installed'])assert.equal(popup({status}),'');
});
test('private gifts, authentication, admin and protected forms never receive the modal',()=>{
 globalThis.__consentDone=true;
 for(const path of ['/presente/private-key','/presente.html','/auth','/admin','/briefing','/checkout/order'])assert.equal(popup({},path),'');
});
test('confirmed installation replaces the installation popup with notification opt-in',()=>{
 globalThis.__consentDone=true;globalThis.__pushUI={isSubscribed:false,isSupported:true,permission:'default'};
 const html=popup({status:'installed',notificationsPending:true});
 assert(!html.includes('role="dialog"'));assert(html.includes('Ativar notificações'));assert(!html.includes('Instalar Agora'));
});

test('the install page owns post-install notifications without duplicate invitations',()=>{
 globalThis.__consentDone=true;assert.equal(popup({status:'installed',notificationsPending:true},'/install'),'');
});
