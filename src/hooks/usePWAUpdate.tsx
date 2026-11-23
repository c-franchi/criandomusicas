import { useEffect, useState, useCallback } from 'react';
import { shouldBlockUpdate, subscribeFlowBusy } from '@/lib/flowGuard';
import { watchAppVersion } from '@/lib/pwa-version-monitor';
// Module-level so the hook list stays unchanged across hot reloads.
let nextEntry: string | undefined;
export const usePWAUpdate = () => {
 const [updateAvailable,setUpdateAvailable]=useState(false);
 const [dismissed,setDismissed]=useState(false);
 const [isUpdating,setIsUpdating]=useState(false);
 const [blocked,setBlocked]=useState(()=>shouldBlockUpdate(window.location.pathname));
 useEffect(()=>watchAppVersion((entry)=>{nextEntry=entry;setUpdateAvailable(true);setDismissed(localStorage.getItem('dismissed-app-entry')===entry||sessionStorage.getItem('attempted-app-entry')===entry);}),[]);
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
   // A stale precached page would reload the old version and show the banner again.
   if('serviceWorker' in navigator){
    const regs=await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.filter(r=>r.active?.scriptURL.endsWith('/sw.js')||r.waiting||r.installing).map(r=>r.unregister()));
   }
   if('caches' in window){
    const names=await caches.keys();
    await Promise.allSettled(names.filter(n=>/workbox|precache|runtime/i.test(n)).map(n=>caches.delete(n)));
   }
  } finally {
   // If this version still does not load after one attempt, do not loop the banner.
   if(nextEntry)sessionStorage.setItem('attempted-app-entry',nextEntry);
   const url=new URL(window.location.href);url.searchParams.set('_v',String(Date.now()));
   window.location.replace(url.toString());
  }
 },[]);
 return {showUpdateBanner:updateAvailable&&!dismissed&&!blocked,updateAvailable,isUpdating,forceUpdate,dismissBanner:useCallback(()=>{if(nextEntry)localStorage.setItem('dismissed-app-entry',nextEntry);setDismissed(true);},[])};
};
