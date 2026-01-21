import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export const usePWAUpdate = () => {
  const [needRefresh, setNeedRefresh] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW Registered:', swUrl);
      // Check for updates every 30 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (swNeedRefresh) {
      setNeedRefresh(true);
      toast.info('Nova versão disponível!', {
        description: 'Clique para atualizar o app',
        duration: Infinity,
        action: {
          label: 'Atualizar',
          onClick: () => {
            updateServiceWorker(true);
          },
        },
      });
    }
  }, [swNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    if (offlineReady) {
      toast.success('App pronto para uso offline!', {
        duration: 3000,
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  const forceUpdate = () => {
    updateServiceWorker(true);
  };

  return {
    needRefresh,
    forceUpdate,
  };
};
