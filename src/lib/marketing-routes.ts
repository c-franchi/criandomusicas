/** Only obsolete Creator campaign anchors move audiences; ordinary pack URLs stay intact. */
export function getLegacyCreatorDestination(pathname: string, hash: string, search = ''): string | null {
  if ((pathname === '/' && hash === '#criadores') || (pathname === '/planos' && hash === '#creator')) {
    return `/criadores${search}`;
  }
  return null;
}

/** Keep post-login navigation same-origin and prevent authentication loops. */
export function safeAuthDestination(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  const parsed = new URL(value, 'https://criandomusicas.com.br');
  if (parsed.origin !== 'https://criandomusicas.com.br' || parsed.pathname.startsWith('/auth')) return '/';
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}