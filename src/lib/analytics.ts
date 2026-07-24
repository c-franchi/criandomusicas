// GA4 + Meta Pixel analytics helpers.
// GA4 ID is set at build time via VITE_GA4_ID (fallback baked in).
// Meta Pixel only activates when VITE_META_PIXEL_ID is set.

export const GA4_ID = (import.meta.env.VITE_GA4_ID as string | undefined) || 'G-338TEK08MW';
export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

type GtagFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
    fbq?: FbqFn;
  }
}

export const trackPageView = (path: string, title?: string) => {
  if (typeof window === 'undefined') return;
  if (window.gtag && GA4_ID) {
    window.gtag('config', GA4_ID, {
      page_path: path,
      page_title: title ?? document.title,
    });
  }
  if (window.fbq && META_PIXEL_ID) {
    window.fbq('track', 'PageView');
    // ViewContent on every SPA route change so remarketing audiences populate
    window.fbq('track', 'ViewContent', {
      content_name: title ?? document.title,
      content_category: path,
    });
  }
};

export const trackEvent = (
  name: string,
  params: Record<string, unknown> = {},
) => {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('event', name, params);
  } catch (e) {
    console.warn('[analytics] gtag event failed', e);
  }
};

// Meta Pixel standard events (no-op if pixel not initialized)
export const trackPixel = (
  name: string,
  params: Record<string, unknown> = {},
) => {
  if (typeof window === 'undefined' || !window.fbq) return;
  try {
    window.fbq('track', name, params);
  } catch (e) {
    console.warn('[analytics] fbq event failed', e);
  }
};

// Convenience wrappers for our key funnel events
export const analytics = {
  signUp: (method = 'email') => {
    trackEvent('sign_up', { method });
    trackPixel('CompleteRegistration');
  },
  login: (method = 'email') => trackEvent('login', { method }),
  beginBriefing: (mode?: string) => trackEvent('begin_briefing', { mode }),
  submitBriefing: (mode?: string) => {
    trackEvent('submit_briefing', { mode });
    trackPixel('Lead', {
      content_name: 'Briefing de música personalizada',
      content_category: mode,
    });
    if (import.meta.env.DEV) {
      // Dev-only trace, no PII
      console.info('[analytics] Lead fired (submitBriefing)', { mode });
    }
  },
  beginCheckout: (value?: number, currency = 'BRL') => {
    trackEvent('begin_checkout', { value, currency });
    trackPixel('InitiateCheckout', { value, currency });
  },
  applyVoucher: (code: string, success: boolean) =>
    trackEvent('apply_voucher', { code, success }),
  purchase: (params: { value: number; currency?: string; transaction_id?: string; event_id?: string }) => {
    const { value, currency = 'BRL', transaction_id, event_id } = params;
    if (typeof window === 'undefined') return;
    // Dedupe: never fire the same purchase twice (page refresh, re-verify, etc.)
    const dedupeKey = `analytics_purchase_${transaction_id || event_id || value}`;
    try {
      if (transaction_id && window.localStorage.getItem(dedupeKey)) {
        return;
      }
      if (transaction_id) window.localStorage.setItem(dedupeKey, String(Date.now()));
    } catch {
      // ignore storage errors
    }
    const eid = event_id || `${transaction_id || 'txn'}_${Date.now()}`;
    trackEvent('purchase', { value, currency, transaction_id, event_id: eid });
    trackPixel('Purchase', { value, currency, eventID: eid });
  },
};
