import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CreatorSubscription {
  subscribed: boolean;
  plan_id: string | null;
  credits_remaining: number;
  credits_total: number;
  credits_used: number;
  subscription_end: string | null;
  current_period_start: string | null;
  subscription_id: string | null;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
}

const PLAN_DETAILS: Record<string, { name: string; price: string; isInstrumental: boolean }> = {
  creator_start: { name: 'Creator Start', price: 'R$ 49,90/mês', isInstrumental: false },
  creator_pro: { name: 'Creator Pro', price: 'R$ 99,90/mês', isInstrumental: false },
  creator_studio: { name: 'Creator Studio', price: 'R$ 199,90/mês', isInstrumental: false },
  creator_start_instrumental: { name: 'Creator Start Instrumental', price: 'R$ 15,90/mês', isInstrumental: true },
  creator_pro_instrumental: { name: 'Creator Pro Instrumental', price: 'R$ 39,90/mês', isInstrumental: true },
  creator_studio_instrumental: { name: 'Creator Studio Instrumental', price: 'R$ 63,90/mês', isInstrumental: true },
};

export function getPlanDetails(planId: string | null) {
  if (!planId) return null;
  return PLAN_DETAILS[planId] || { name: planId, price: '', isInstrumental: false };
}

export function useCreatorSubscription() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<CreatorSubscription | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-creator-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription(null);
      } else {
        setSubscription(data);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  const cancelSubscription = useCallback(async () => {
    if (!session?.access_token) {
      return { success: false, error: 'Não autenticado' };
    }

    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-creator-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Refresh subscription status
      await checkSubscription();
      return { success: true, cancel_at: data.cancel_at };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    } finally {
      setCancelling(false);
    }
  }, [session?.access_token, checkSubscription]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    loading,
    subscription,
    hasActiveSubscription: subscription?.subscribed ?? false,
    planDetails: getPlanDetails(subscription?.plan_id ?? null),
    cancelSubscription,
    cancelling,
    refresh: checkSubscription,
  };
}
