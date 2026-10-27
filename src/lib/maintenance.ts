export const maintenanceQueryKey = ['site-maintenance'] as const;

export const isMaintenanceExemptPath = (path: string) => /^\/presente\/[a-f0-9]{64}\/?$/.test(path) || [
  '/auth', '/auth/callback', '/~oauth/callback', '/pagamento-sucesso',
  '/privacidade', '/termos', '/regras', '/manutencao',
].includes(path.replace(/\/+$/, '') || '/');

export function maintenanceDecision(input: {
  path: string;
  authLoading: boolean;
  settingsLoading: boolean;
  settingsError: boolean;
  enabled: boolean;
  signedIn: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
}): 'allow' | 'loading' | 'login' | 'maintenance' {
  if (isMaintenanceExemptPath(input.path)) return 'allow';
  if (input.authLoading) return 'loading';
  // Keep an explicit recovery route even if the settings query is unavailable.
  if (/^\/admin(?:\/|$)/.test(input.path) && !input.signedIn) return 'login';
  if (input.signedIn && input.roleLoading) return 'loading';
  if (input.signedIn && input.isAdmin) return 'allow';
  if (input.settingsLoading) return 'loading';
  if (input.settingsError || input.enabled) return 'maintenance';
  return 'allow';
}
