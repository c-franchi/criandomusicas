import i18n from '@/lib/i18n';
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

// Credits are fetched from pricing_config table - these are fallback values
// Values should match: creator_start=40, creator_pro=150, creator_studio=230
const PLAN_DETAILS: Record<string, { name: string; price: string; credits: number }> = {
  creator_start: { name: 'Creator Start', get price() { return i18n.t('subscription.startPrice', { ns: 'uiPayments' }); }, credits: 40 },
  creator_pro: { name: 'Creator Pro', get price() { return i18n.t('subscription.proPrice', { ns: 'uiPayments' }); }, credits: 150 },
  creator_studio: { name: 'Creator Studio', get price() { return i18n.t('subscription.studioPrice', { ns: 'uiPayments' }); }, credits: 230 },
};

export function getPlanDetails(planId: string | null) {
  if (!planId) return null;
  return PLAN_DETAILS[planId] || { name: planId, price: '', credits: 0 };
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
      return { success: false, error: i18n.t('subscription.unauthenticated', { ns: 'uiPayments' }) };
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
      const errorMessage = err instanceof Error ? err.message : i18n.t('unknownError', { ns: 'uiPayments' });
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
