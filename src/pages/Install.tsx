import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Download, Music, Smartphone, Bell } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { PostInstallNotifications } from '@/components/PwaInstallPrompt';
import { NotificationToggle } from '@/components/PushNotificationPrompt';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Install() {
 const {t}=useTranslation('common'); const pwa=usePwaInstall(); const {user}=useAuth();
 const installed=pwa.status==='installed';
 const pending=pwa.status==='prompting'||pwa.status==='installing';
 const description=installed?'install.installedDesc':pending?'install.direct.confirming':pwa.status==='ready'?'install.direct.description':pwa.status==='unsupported'?'install.direct.unsupported':'install.direct.waiting';
 return <main className="min-h-screen bg-background px-4 py-8 text-foreground">
  <div className="mx-auto max-w-2xl space-y-6">
   <Button asChild variant="ghost"><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />{t('backHome')}</Link></Button>
   <header className="space-y-3 text-center"><Music className="mx-auto h-12 w-12 text-primary" /><h1 className="text-3xl font-bold">{t('install.title')}</h1><p className="text-muted-foreground">{t('install.subtitle')}</p></header>
   <Card className="space-y-5 p-6">
    <div className="flex items-center gap-3">{installed?<Check className="h-8 w-8 text-primary" />:<Download className="h-8 w-8 text-primary" />}<h2 className="text-xl font-semibold">{t(installed?'install.installed':'install.direct.title')}</h2></div>
    <p role="status" className="text-sm leading-relaxed text-muted-foreground">{t(description)}</p>
    {!installed&&pwa.status!=='unsupported'&&<Button className="min-h-12 w-full" disabled={pwa.status!=='ready'} onClick={()=>void pwa.install()}>{t(pending?'install.direct.confirming':pwa.status==='ready'?'install.installNow':'install.direct.preparing')}</Button>}
    {pwa.result&&<p role="status" className="text-sm">{t('install.direct.'+pwa.result)}</p>}
    {!installed&&<p className="text-xs leading-relaxed text-muted-foreground">{t('install.direct.confirmation')}</p>}
   </Card>
   {pwa.notificationsPending?<Card className="p-6"><PostInstallNotifications /></Card>:installed&&user?<Card className="space-y-4 p-6"><h2 className="font-semibold">{t('install.notifications.title')}</h2><NotificationToggle /></Card>:null}
   <div className="grid gap-4 sm:grid-cols-3">
    {[['quickAccess',Smartphone],['notifications',Bell],['fullscreen',Music]].map(([key,Icon])=>{const FeatureIcon=Icon as typeof Music;return <Card key={String(key)} className="space-y-3 p-4"><FeatureIcon className="h-6 w-6 text-primary" /><p className="text-sm">{t('install.benefits.'+(key==='quickAccess'?'fast':key))}</p></Card>;})}
   </div>
  </div>
 </main>;
}
