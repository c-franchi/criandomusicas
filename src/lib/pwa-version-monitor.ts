/** Check the deployed entry without reloading the page or waiting on a worker update. */
export const APP_VERSION_CHECK_INTERVAL = 15_000;
const REQUEST_TIMEOUT = 8_000;
const WORKER_CHECK_INTERVAL = 60_000;

export function watchAppVersion(
  onAvailable: () => void,
  host: Window = window,
  doc: Document = document,
) {
  const entry = doc.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src');
  const normalize = (value: string) => new URL(value, host.location.origin).pathname;
  let stopped = false;
  let checking = false;
  let controller: AbortController | undefined;
  let lastReported: string | undefined;
  let lastWorkerCheck = -Infinity;
  let workerChecking = false;

  const checkWorker = (force = false) => {
    if (!host.navigator.serviceWorker || workerChecking || (!force && Date.now() - lastWorkerCheck < WORKER_CHECK_INTERVAL)) return;
    lastWorkerCheck = Date.now();
    workerChecking = true;
    // A stalled worker network request must not delay version detection.
    void host.navigator.serviceWorker.getRegistration()
      .then(registration => stopped ? undefined : registration?.update())
      .catch(() => { /* Retry on a later check. */ })
      .finally(() => { workerChecking = false; });
  };

  const check = async () => {
    if (stopped || checking || doc.visibilityState === 'hidden') return;
    checking = true;
    controller = new AbortController();
    const timeout = host.setTimeout(() => controller?.abort(), REQUEST_TIMEOUT);
    checkWorker();
    try {
      const response = await host.fetch('/app-version.json', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      const version = await response.json();
      if (stopped || !entry || typeof version.entry !== 'string') return;
      const next = normalize(version.entry);
      if (next !== normalize(entry) && next !== lastReported) {
        lastReported = next;
        checkWorker(true);
        onAvailable();
      }
    } catch { /* Keep the current page usable offline and retry automatically. */ }
    finally {
      host.clearTimeout(timeout);
      checking = false;
      controller = undefined;
    }
  };
  const resume = () => { void check(); };
  const workerMessage = (event: MessageEvent) => { if (event.data?.type === 'SW_UPDATED') resume(); };
  const interval = host.setInterval(resume, APP_VERSION_CHECK_INTERVAL);
  host.addEventListener('focus', resume);
  host.addEventListener('pageshow', resume);
  host.addEventListener('online', resume);
  doc.addEventListener('visibilitychange', resume);
  host.navigator.serviceWorker?.addEventListener('controllerchange', resume);
  host.navigator.serviceWorker?.addEventListener('message', workerMessage);
  resume();

  return () => {
    stopped = true;
    host.clearInterval(interval);
    controller?.abort();
    host.removeEventListener('focus', resume);
    host.removeEventListener('pageshow', resume);
    host.removeEventListener('online', resume);
    doc.removeEventListener('visibilitychange', resume);
    host.navigator.serviceWorker?.removeEventListener('controllerchange', resume);
    host.navigator.serviceWorker?.removeEventListener('message', workerMessage);
  };
}
