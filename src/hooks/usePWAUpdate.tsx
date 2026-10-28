import { useEffect, useState, useCallback } from 'react';
import { shouldBlockUpdate, subscribeFlowBusy } from '@/lib/flowGuard';
export const usePWAUpdate = () => {
 const [updateAvailable,setUpdateAvailable]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const [isUpdating,setIsUpdating]=useState(false);
 const [blocked,setBlocked]=useState(()=>shouldBlockUpdate(window.location.pathname));
 useEffect(()=>{
  let stopped=false, checking=false;
  const entry=document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src');
  const check=async()=>{
   if(checking || document.visibilityState==='hidden') return;
   checking=true;
   try {
    const response=await fetch('/app-version.json',{cache:'no-store'});
    if(response.ok){const version=await response.json();if(!stopped && entry && version.entry && new URL(version.entry,location.origin).pathname!==new URL(entry,location.origin).pathname) setUpdateAvailable(true);}
    if('serviceWorker' in navigator) {const reg=await navigator.serviceWorker.getRegistration(); await reg?.update();}
   } catch { /* Offline clients retain their current page. */ }
   finally {checking=false;}
  };
  const onController=()=>{if(!stopped)setUpdateAvailable(true);};
  const onMessage=(e:MessageEvent)=>{if(e.data?.type==='SW_UPDATED') onController();};
  void check();const interval=setInterval(()=>void check(),60000);
  window.addEventListener('focus',check);
  navigator.serviceWorker?.addEventListener('controllerchange',onController);
  navigator.serviceWorker?.addEventListener('message',onMessage);
  return ()=>{stopped=true;clearInterval(interval);window.removeEventListener('focus',check);navigator.serviceWorker?.removeEventListener('controllerchange',onController);navigator.serviceWorker?.removeEventListener('message',onMessage);};
 },[]);
 useEffect(()=>{
  const check=()=>setBlocked(shouldBlockUpdate(window.location.pathname));check();
  const interval=setInterval(check,1000),unsubscribe=subscribeFlowBusy(check);
  window.addEventListener('popstate',check);
  return ()=>{clearInterval(interval);unsubscribe();window.removeEventListener('popstate',check);};
 },[]);
 const forceUpdate=useCallback(async()=>{
  if(shouldBlockUpdate(window.location.pathname)) return;
  setIsUpdating(true);
  try {
   if('serviceWorker' in navigator){
    const reg=await navigator.serviceWorker.getRegistration();
    if(reg?.waiting) await new Promise<void>(resolve=>{
     const finish=()=>{navigator.serviceWorker.removeEventListener('controllerchange',finish);clearTimeout(timeout);resolve();};
     const timeout=setTimeout(finish,3000);
     navigator.serviceWorker.addEventListener('controllerchange',finish);reg.waiting!.postMessage({type:'SKIP_WAITING'});
    });
   }
  } finally {window.location.reload();}
 },[]);
 return {showUpdateBanner:updateAvailable&&!dismissed&&!blocked,updateAvailable,isUpdating,forceUpdate,dismissBanner:useCallback(()=>setDismissed(true),[])};
};
