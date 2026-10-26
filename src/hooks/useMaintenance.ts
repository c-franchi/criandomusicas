import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { maintenanceQueryKey } from '@/lib/maintenance';

export function useMaintenance() {
  return useQuery({
    queryKey: maintenanceQueryKey,
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const { data, error } = await supabase.from('site_maintenance')
          .select('id, enabled, title, message, updated_at').eq('id', true)
          .abortSignal(controller.signal).single();
        if (error) throw error;
        return data;
      } finally {
        window.clearTimeout(timeout);
      }
    },
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
