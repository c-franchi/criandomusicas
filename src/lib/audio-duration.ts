/** Read the real file metadata before publishing a short audio track. */
export function readAudioDuration(file: File, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const cleanup = () => {
      audio.onerror = null;
      audio.onloadedmetadata = null;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };
    const fail = () => {
      cleanup();
      reject(
        new Error(
          "Não foi possível conferir a duração do áudio. Envie um arquivo válido.",
        ),
      );
    };
    const cancel = () => { cleanup(); reject(new Error('Envio cancelado.')); };
    const timer = setTimeout(fail, 15000);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    audio.preload = "metadata";
    audio.onerror = fail;
    audio.onloadedmetadata = () => {
      const seconds = audio.duration;
      cleanup();
      if (Number.isFinite(seconds) && seconds > 0) resolve(seconds);
      else reject(new Error("Duração do áudio indisponível."));
    };
    audio.src = url;
  });
}
