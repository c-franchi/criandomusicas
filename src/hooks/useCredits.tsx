import i18n from '@/lib/i18n';
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
  source?: 'package' | 'subscription';
}

interface ActivePackage {
  id: string;
  plan_id: string;
  total_credits: number;
  used_credits: number;
  available_credits: number;
  purchased_at: string;
  expires_at: string | null;
  source?: 'package' | 'subscription';
}

interface SubscriptionInfo {
  plan_id: string | null;
  plan_name: string | null;
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  subscription_end: string | null;
  current_period_start: string | null;
}

interface CreditsState {
  loading: boolean;
  hasCredits: boolean;
  totalCredits: number;
  // Backwards compatibility (all credits are now universal)
  totalAvailable: number;
  totalVocal: number;
  totalInstrumental: number;
  activePackage: ActivePackage | null;
  allPackages: CreditPackage[];
  subscriptionInfo: SubscriptionInfo | null;
  error: string | null;
}

export function useCredits() {
  const { user } = useAuth();
  const [state, setState] = useState<CreditsState>({
    loading: true,
    hasCredits: false,
    totalCredits: 0,
    totalAvailable: 0,
    totalVocal: 0,
    totalInstrumental: 0,
    activePackage: null,
    allPackages: [],
    subscriptionInfo: null,
    error: null,
  });

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setState({
        loading: false,
        hasCredits: false,
        totalCredits: 0,
        totalAvailable: 0,
        totalVocal: 0,
        totalInstrumental: 0,
        activePackage: null,
        allPackages: [],
        subscriptionInfo: null,
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

      // Universal credits - total_credits is the unified count
      const totalCredits = data.total_credits || 0;

      setState({
        loading: false,
        hasCredits: totalCredits > 0,
        totalCredits: totalCredits,
        // Backwards compatibility - all fields show the same universal total
        totalAvailable: totalCredits,
        totalVocal: totalCredits,
        totalInstrumental: totalCredits,
        activePackage: data.active_package || null,
        allPackages: data.all_packages || [],
        subscriptionInfo: data.subscription_info || null,
        error: null,
      });
    } catch (err) {
      console.error('Error in useCredits:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : i18n.t('unknownError', { ns: 'uiPayments' }),
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
        error: err instanceof Error ? err.message : i18n.t('credits.useError', { ns: 'uiPayments' }),
      };
    }
  }, [fetchCredits]);

  return {
    ...state,
    refresh: fetchCredits,
    useCredit,
  };
}

// Plan labels for display (simplified - no type distinction)
export const PLAN_LABELS: Record<string, string> = {
  get 'single'() { return i18n.t('credits.single', { ns: 'uiPayments' }); },
  get 'single_instrumental'() { return i18n.t('credits.single', { ns: 'uiPayments' }); },
  get 'single_custom_lyric'() { return i18n.t('credits.customLyric', { ns: 'uiPayments' }); },
  get 'package'() { return i18n.t('credits.package3', { ns: 'uiPayments' }); },
  get 'package_instrumental'() { return i18n.t('credits.package3', { ns: 'uiPayments' }); },
  get 'subscription'() { return i18n.t('credits.package5', { ns: 'uiPayments' }); },
  get 'subscription_instrumental'() { return i18n.t('credits.package5', { ns: 'uiPayments' }); },
  // Creator subscription plans
  'creator_start': 'Creator Start',
  'creator_pro': 'Creator Pro',
  'creator_studio': 'Creator Studio',
};

export const getPlanLabel = (planId: string): string => {
  return PLAN_LABELS[planId] || planId;
};

// Get number of credits for a plan
export const getCreditsForPlan = (planId: string): number => {
  if (planId.includes('subscription') && !planId.includes('creator')) return 5;
  if (planId.includes('package')) return 3;
  // Creator plans - values from pricing_config
  if (planId.includes('creator_studio')) return 230;
  if (planId.includes('creator_pro')) return 150;
  if (planId.includes('creator_start')) return 40;
  return 1;
};

// Check if plan is a subscription type
export const isSubscriptionPlan = (planId: string): boolean => {
  return planId.startsWith('creator_');
};
