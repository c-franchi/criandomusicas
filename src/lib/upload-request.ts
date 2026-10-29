/** Bound both auth waits and network/body reads; never leave the ADM locked forever. */
export function uploadRequest<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  options: { signal?: AbortSignal; timeoutMs?: number; message?: string } = {},
): Promise<T> {
  const controller = new AbortController();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
      if (error) reject(error); else resolve(value as T);
    };
    const cancel = () => {
      finish(new Error('Envio cancelado. Confira o pedido antes de tentar novamente.'));
      controller.abort();
    };
    const timer = setTimeout(() => {
      finish(new Error(options.message || 'A operação demorou demais. Confira sua conexão e o pedido antes de tentar novamente.'));
      controller.abort();
    }, options.timeoutMs ?? 20000);
    if (options.signal?.aborted) { cancel(); return; }
    options.signal?.addEventListener('abort', cancel, { once: true });
    Promise.resolve().then(() => settled ? undefined : operation(controller.signal)).then(
      value => finish(undefined, value), error => finish(error),
    );
  });
}

/** This scoped fetch is used only by music uploads, including their DB writes. */
export function musicUploadFetch(signal: AbortSignal, transport: typeof fetch = fetch): typeof fetch {
  return async (input, init) => uploadRequest(async requestSignal => {
    const response = await transport(input, { ...init, signal: requestSignal });
    // Include a stalled response body in the deadline, not only the headers.
    const body = await response.arrayBuffer();
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  }, {
    signal,
    timeoutMs: String(input).includes('/storage/v1/') ? 180000 : 20000,
  });
}
