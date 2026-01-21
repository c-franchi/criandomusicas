import { useEffect, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWAUpdate = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [swNeedRefresh],
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

  // Listen for service worker messages about updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('SW Update detected via message:', event.data.version);
        setShowUpdateBanner(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Show banner when SW needs refresh
  useEffect(() => {
    if (swNeedRefresh) {
      console.log('SW needs refresh detected');
      setShowUpdateBanner(true);
    }
  }, [swNeedRefresh]);

  useEffect(() => {
    if (offlineReady) {
      console.log('App ready for offline use');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  const forceUpdate = useCallback(() => {
    setIsUpdating(true);
    updateServiceWorker(true);
    // Reload page after a brief delay to ensure SW activates
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, [updateServiceWorker]);

  const dismissBanner = useCallback(() => {
    setShowUpdateBanner(false);
  }, []);

  return {
    showUpdateBanner,
    isUpdating,
    forceUpdate,
    dismissBanner,
  };
};
