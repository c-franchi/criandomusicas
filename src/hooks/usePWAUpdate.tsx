import { useEffect, useState, useCallback } from 'react';
import { shouldBlockUpdate, subscribeFlowBusy } from '@/lib/flowGuard';
import { watchAppVersion } from '@/lib/pwa-version-monitor';
export const usePWAUpdate = () => {
 const [updateAvailable,setUpdateAvailable]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const [isUpdating,setIsUpdating]=useState(false);
 const [blocked,setBlocked]=useState(()=>shouldBlockUpdate(window.location.pathname));
 useEffect(()=>watchAppVersion(()=>{setUpdateAvailable(true);setDismissed(false);}),[]);
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
