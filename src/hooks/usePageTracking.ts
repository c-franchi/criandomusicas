import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

/**
 * Fires GA4 page_view (and Meta PageView) on every SPA route change.
 * Must be mounted inside <BrowserRouter>.
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Defer to next tick so the new page title is already applied by Helmet.
    const id = window.setTimeout(() => {
      trackPageView(location.pathname + location.search);
    }, 0);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);
};
