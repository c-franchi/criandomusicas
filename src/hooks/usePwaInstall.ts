import { useSyncExternalStore } from 'react';
import { pwaInstaller } from '@/lib/pwa-install';
export function usePwaInstall() {
  const state=useSyncExternalStore(pwaInstaller.subscribe,pwaInstaller.getSnapshot,pwaInstaller.getSnapshot);
  return {...state,install:pwaInstaller.install,dismiss:pwaInstaller.dismiss,finishNotifications:pwaInstaller.finishNotifications};
}
