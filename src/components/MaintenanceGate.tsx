import { type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenance } from '@/hooks/useMaintenance';
import { supabase } from '@/integrations/supabase/client';
import { maintenanceDecision } from '@/lib/maintenance';
import PageLoader from '@/components/PageLoader';
import MaintenancePage from '@/pages/Maintenance';

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { pathname, search } = useLocation();
  const { t } = useTranslation('common');
  const settings = useMaintenance();
  // Keyed by identity: no stale admin bypass when accounts change or sign out.
  const role = useQuery({
    queryKey: ['maintenance-admin-role', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role')
        .eq('user_id', user!.id).eq('role', 'admin').maybeSingle();
      if (error) throw error;
      return !!data;
    },
    staleTime: 15000,
    retry: 1,
  });
  const decision = maintenanceDecision({
    path: pathname, authLoading, settingsLoading: settings.isPending,
    settingsError: settings.isError, enabled: settings.data?.enabled ?? true,
    signedIn: !!user, roleLoading: role.isPending, isAdmin: role.data === true && !role.isError,
  });
  if (decision === 'loading') return <PageLoader />;
  if (decision === 'login') return <Navigate to={`/auth?redirect=${encodeURIComponent(pathname + search)}`} replace />;
  if (decision === 'maintenance') return <MaintenancePage title={settings.data?.title} message={settings.data?.message} onRetry={() => { void settings.refetch(); }} retrying={settings.isFetching} />;
  return (
    <>
      {user && role.data === true && settings.data?.enabled && <aside className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm" role="status">{t('maintenance.adminBanner')} <Link to="/admin/configuracoes?tab=maintenance" className="font-semibold underline underline-offset-4">{t('maintenance.manage')}</Link></aside>}
      {children}
    </>
  );
}
