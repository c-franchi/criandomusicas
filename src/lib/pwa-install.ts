export interface NativeInstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export type InstallStatus = 'waiting' | 'ready' | 'prompting' | 'installing' | 'installed' | 'unsupported';
export interface InstallSnapshot {
  status: InstallStatus;
  notificationsPending: boolean;
  dismissedUntil: number;
  result: 'dismissed' | 'error' | null;
}
const pendingKey = 'cm-pwa-notification-pending';
const doneKey = 'cm-pwa-notification-offered';
const dismissedKey = 'cm-pwa-install-dismissed-until';
/** One event owner for the entire application; survives SPA navigation. */
export function createPwaInstaller(host?: Window) {
  const read = (key: string) => { try { return host?.localStorage.getItem(key); } catch { return null; } };
  const write = (key: string, value: string) => { try { host?.localStorage.setItem(key,value); } catch { /* Storage is optional. */ } };
  const display = host?.matchMedia?.('(display-mode: standalone)');
  const standalone = () => !!display?.matches || !!(host?.navigator as Navigator & {standalone?:boolean})?.standalone;
  let event: NativeInstallEvent | null = null;
  let state: InstallSnapshot = {
    status: standalone() ? 'installed' : host && 'onbeforeinstallprompt' in host ? 'waiting' : 'unsupported',
    notificationsPending: read(pendingKey) === 'true' || (standalone() && read(doneKey) !== 'true'),
    dismissedUntil: Number(read(dismissedKey)) || 0,
    result: null,
  };
  const listeners = new Set<() => void>();
  const update = (patch:Partial<InstallSnapshot>) => { state={...state,...patch}; listeners.forEach(fn=>fn()); };
  const installed = () => {
    event=null;
    const pending = read(doneKey)!=='true';
    if(pending) write(pendingKey,'true');
    update({status:'installed',notificationsPending:pending,result:null});
  };
  const before = (e:Event) => {
    if(['installed','prompting','installing'].includes(state.status)) return;
    e.preventDefault();
    event=e as NativeInstallEvent;
    update({status:'ready',result:null});
  };
  const displayChanged = () => { if(standalone()) installed(); };
  host?.addEventListener('beforeinstallprompt',before);
  host?.addEventListener('appinstalled',installed);
  display?.addEventListener?.('change',displayChanged);
  return {
    getSnapshot:()=>state,
    subscribe:(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};},
    install: async () => {
      if(!event || state.status!=='ready') return 'unavailable' as const;
      const current=event; event=null;
      update({status:'prompting',result:null});
      try {
        // No network or navigation before prompt(): retain the button's user activation.
        await current.prompt();
        const choice=await current.userChoice;
        if((state as InstallSnapshot).status==='installed') return 'installed' as const;
        if(choice.outcome==='accepted') { update({status:'installing'}); return 'accepted' as const; }
        write(dismissedKey,String(Date.now()+7*86400000));
        update({status:'waiting',result:'dismissed',dismissedUntil:Date.now()+7*86400000});
        return 'dismissed' as const;
      } catch {
        if((state as InstallSnapshot).status!=='installed') update({status:'waiting',result:'error'});
        return 'error' as const;
      }
    },
    dismiss:()=>{const until=Date.now()+7*86400000;write(dismissedKey,String(until));update({dismissedUntil:until});},
    finishNotifications:()=>{write(pendingKey,'false');write(doneKey,'true');update({notificationsPending:false});},
    dispose:()=>{host?.removeEventListener('beforeinstallprompt',before);host?.removeEventListener('appinstalled',installed);display?.removeEventListener?.('change',displayChanged);listeners.clear();},
  };
}
export const pwaInstaller = createPwaInstaller(typeof window==='undefined'?undefined:window);
