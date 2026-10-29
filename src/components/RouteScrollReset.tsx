import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function scrollPageToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

/** Route changes start at the top; deliberate section links retain their target. */
export default function RouteScrollReset() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (!hash) { scrollPageToTop(); return; }
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { scrollPageToTop(); return; }
    const scrollToAnchor = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      return true;
    };
    if (scrollToAnchor()) return;
    // Lazy pages may mount after the route effect. No timing-dependent 100ms guess.
    scrollPageToTop();
    const observer = new MutationObserver(() => { if (scrollToAnchor()) observer.disconnect(); });
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 10000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [pathname, hash]);
  return null;
}
