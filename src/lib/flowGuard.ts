/**
 * Flow guard: prevents disruptive actions (like a PWA reload) while the user
 * is in the middle of filling something out (briefing, checkout, lyrics).
 */

let busyCount = 0;
const listeners = new Set<(busy: boolean) => void>();

const emit = () => listeners.forEach((l) => l(busyCount > 0));

export const setFlowBusy = (busy: boolean) => {
  busyCount = busy ? busyCount + 1 : Math.max(0, busyCount - 1);
  emit();
};

export const isFlowBusy = () => busyCount > 0;

export const subscribeFlowBusy = (listener: (busy: boolean) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Routes where an app reload would make the user lose filled-in data. */
const PROTECTED_ROUTE_PATTERNS = [
  /^\/briefing/,
  /^\/criar-musica/,
  /^\/create-song/,
  /^\/checkout\//,
  /^\/pagamento\//,
  /^\/pedido\/[^/]+\/letras/,
  /^\/video-checkout\//,
  /^\/video-upload\//,
  /^\/creator-checkout\//,
];

export const isProtectedPath = (pathname: string) =>
  PROTECTED_ROUTE_PATTERNS.some((re) => re.test(pathname));

/** True when it is NOT safe to force an app update right now. */
export const shouldBlockUpdate = (pathname: string) =>
  isFlowBusy() || isProtectedPath(pathname);
