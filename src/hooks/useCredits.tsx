import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CreditPackage {
  id: string;
  plan_id: string;
  total_credits: number;
  used_credits: number;
  available_credits: number;
  purchased_at: string;
  is_active: boolean;
}

interface ActivePackage {
  id: string;
  plan_id: string;
  total_credits: number;
  used_credits: number;
  available_credits: number;
  purchased_at: string;
  expires_at: string | null;
}

interface CreditsState {
  loading: boolean;
  hasCredits: boolean;
  totalAvailable: number;
  activePackage: ActivePackage | null;
  allPackages: CreditPackage[];
  error: string | null;
}

export function useCredits() {
  const { user } = useAuth();
  const [state, setState] = useState<CreditsState>({
    loading: true,
    hasCredits: false,
    totalAvailable: 0,
    activePackage: null,
    allPackages: [],
    error: null,
  });

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setState({
        loading: false,
        hasCredits: false,
        totalAvailable: 0,
        activePackage: null,
        allPackages: [],
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-credits');

      if (error) {
        console.error('Error checking credits:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return;
      }

      setState({
        loading: false,
        hasCredits: data.has_credits || false,
        totalAvailable: data.total_available || 0,
        activePackage: data.active_package || null,
        allPackages: data.all_packages || [],
        error: null,
      });
    } catch (err) {
      console.error('Error in useCredits:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const useCredit = useCallback(async (orderId: string): Promise<{ success: boolean; error?: string; needsPurchase?: boolean }> => {
    try {
      const { data, error } = await supabase.functions.invoke('use-credit', {
        body: { orderId },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { 
          success: false, 
          error: data.error,
          needsPurchase: data.needs_purchase,
        };
      }

      // Refresh credits after use
      await fetchCredits();

      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro ao usar crédito',
      };
    }
  }, [fetchCredits]);

  return {
    ...state,
    refresh: fetchCredits,
    useCredit,
  };
}

// Plan labels for display
export const PLAN_LABELS: Record<string, string> = {
  'single': 'Música Única',
  'single_instrumental': 'Instrumental Única',
  'single_custom_lyric': 'Letra Própria',
  'package': 'Pacote 3 Músicas',
  'package_instrumental': 'Pacote 3 Instrumentais',
  'subscription': 'Pacote 5 Músicas',
  'subscription_instrumental': 'Pacote 5 Instrumentais',
};

export const getPlanLabel = (planId: string): string => {
  return PLAN_LABELS[planId] || planId;
};
