import { useEffect, useState, useCallback } from 'react';

// Safe wrapper to avoid "Should have a queue" React error
const useSafeRegisterSW = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker manually to avoid vite-plugin-pwa hook issues
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        console.log('SW ready:', reg.scope);
      });

      // Check for updates periodically
      const checkForUpdates = () => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.update().catch(console.error);
          }
        });
      };

      const interval = setInterval(checkForUpdates, 30000);

      // Listen for new service worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('SW controller changed - new version available');
        setNeedRefresh(true);
      });

      return () => clearInterval(interval);
    }
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Navigate to home first to avoid black screen, then reload
    window.location.href = '/';
  }, [registration]);

  return { needRefresh, updateServiceWorker };
};

export const usePWAUpdate = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { needRefresh, updateServiceWorker } = useSafeRegisterSW();

  // Listen for service worker messages about updates
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('SW Update detected via message:', event.data.version);
        setShowUpdateBanner(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Show banner when SW needs refresh
  useEffect(() => {
    if (needRefresh) {
      console.log('SW needs refresh detected');
      setShowUpdateBanner(true);
    }
  }, [needRefresh]);

  const forceUpdate = useCallback(() => {
    setIsUpdating(true);
    updateServiceWorker();
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
