import { isPublicGiftPath } from './gift-entry-paths.mjs';
// Meta Pixel loader with LGPD consent gating.
// Only initializes fbq after the user grants marketing consent.

import { META_PIXEL_ID } from "./analytics";

const CONSENT_STORAGE_KEY = "criandomusicas_consent";
let initialized = false;

const hasMarketingConsent = (): boolean => {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!parsed?.marketing;
  } catch {
    return false;
  }
};

const injectPixelScript = () => {
  if (typeof window === "undefined" || isPublicGiftPath(window.location.pathname)) return;
  if ((window as any).fbq) return;
  /* eslint-disable */
  // Facebook Pixel base code
  (function (f: any, b: any, e: any, v: any) {
    let n: any, t: any, s: any;
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
};

export const initMetaPixel = () => {
  if (typeof window === "undefined" || isPublicGiftPath(window.location.pathname)) return;
  if (!META_PIXEL_ID) return;
  if (initialized) return;
  if (!hasMarketingConsent()) return;

  injectPixelScript();
  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
  initialized = true;
};

// Called by CookieConsent after the user changes preferences.
export const onConsentUpdated = () => {
  initMetaPixel();
};

// Attempt init on module load (in case consent was granted previously).
if (typeof window !== "undefined") {
  // Defer to avoid blocking initial render
  setTimeout(initMetaPixel, 0);
  window.addEventListener("criandomusicas:consent-updated", initMetaPixel);
}
