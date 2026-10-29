import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Download, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { shouldBlockUpdate, subscribeFlowBusy } from '@/lib/flowGuard';
import { isPublicGiftPath } from '@/lib/gift-entry-paths.mjs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function PostInstallNotifications() {
 const {t}=useTranslation('common'); const {user}=useAuth();const location=useLocation();const pwa=usePwaInstall();
 const push=usePushNotifications();
 useEffect(()=>{if(push.isSubscribed||push.permission==='denied') pwa.finishNotifications();},[push.isSubscribed,push.permission]);
 if(push.isSubscribed) return <p role="status">{t('install.push.active')}</p>;
 if(!push.isSupported) return <p role="status">{t('install.push.unavailable')}</p>;
 if(push.permission==='denied') return <p role="status">{t('install.push.denied')}</p>;
 const returnTo=location.pathname+location.search;
 return <div className="space-y-3">
  <h3 className="flex items-center gap-2 font-semibold"><Bell className="h-5 w-5" />{t('install.push.title')}</h3>
  <p className="text-sm text-muted-foreground">{t(user?'install.push.description':'install.push.signInDescription')}</p>
  <div className="flex flex-wrap gap-2">
   {user?<Button disabled={push.isLoading} onClick={()=>void push.subscribe().then(ok=>{if(ok)pwa.finishNotifications();})}>{t(push.isLoading?'install.push.activating':'install.push.activate')}</Button>:<Button asChild><Link to={`/auth?redirect=${encodeURIComponent(returnTo)}`}>{t('install.push.signIn')}</Link></Button>}
   <Button variant="ghost" onClick={pwa.finishNotifications}>{t('install.push.later')}</Button>
  </div>
 </div>;
}

/** A soft invitation; never opens a permission dialog without a click. */
export default function PwaInstallPrompt() {
 const {t}=useTranslation('common');const pwa=usePwaInstall();const {pathname}=useLocation();
 const [blocked,setBlocked]=useState(()=>shouldBlockUpdate(pathname));
 const [consentDone,setConsentDone]=useState(()=>{try{return !!localStorage.getItem('criandomusicas_consent');}catch{return false;}});
 useEffect(()=>{const check=()=>setBlocked(shouldBlockUpdate(pathname));check();const unsubscribe=subscribeFlowBusy(check);return ()=>{unsubscribe();};},[pathname]);
 useEffect(()=>{const done=()=>setConsentDone(true);window.addEventListener('criandomusicas:consent-updated',done);return()=>window.removeEventListener('criandomusicas:consent-updated',done);},[]);
 if(isPublicGiftPath(pathname)||pathname==='/install'||pathname.startsWith('/auth')||pathname.startsWith('/~oauth')||pathname.startsWith('/admin')||blocked) return null;
 const after=pwa.notificationsPending;
 const offer=pwa.status==='ready'&&Date.now()>=pwa.dismissedUntil&&consentDone;
 if(!after&&!offer) return null;
 return <aside className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:max-w-sm" aria-label={t(after?'install.push.title':'install.title')}>
  <Card className="relative space-y-3 border-primary/30 bg-card p-5 shadow-xl">
   {after?<PostInstallNotifications />:<>
    <h3 className="flex items-center gap-2 pr-5 font-semibold"><Download className="h-5 w-5" />{t('install.title')}</h3>
    <p className="text-sm text-muted-foreground">{t('install.direct.description')}</p>
    <Button className="min-h-12 w-full" onClick={()=>void pwa.install()}>{t('install.installNow')}</Button>
    <Button variant="ghost" size="icon" className="absolute right-1 top-1" aria-label={t('install.push.later')} onClick={pwa.dismiss}><X className="h-4 w-4" /></Button>
   </>}
  </Card>
 </aside>;
}
