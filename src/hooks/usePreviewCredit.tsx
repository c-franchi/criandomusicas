import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PreviewCreditState {
  loading: boolean;
  hasPreviewCredit: boolean;
  previewCreditUsed: boolean;
  previewCreditAvailable: boolean;
  error: string | null;
}

export function usePreviewCredit() {
  const { user } = useAuth();
  const [state, setState] = useState<PreviewCreditState>({
    loading: true,
    hasPreviewCredit: false,
    previewCreditUsed: false,
    previewCreditAvailable: false,
    error: null,
  });

  const checkPreviewCredit = useCallback(async () => {
    if (!user) {
      setState({
        loading: false,
        hasPreviewCredit: false,
        previewCreditUsed: false,
        previewCreditAvailable: false,
        error: null,
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check for preview credit in user_credits table
      const { data: previewCredit, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', 'preview_test')
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (previewCredit) {
        const used = previewCredit.used_credits >= previewCredit.total_credits;
        setState({
          loading: false,
          hasPreviewCredit: true,
          previewCreditUsed: used,
          previewCreditAvailable: !used && previewCredit.is_active,
          error: null,
        });
      } else {
        setState({
          loading: false,
          hasPreviewCredit: false,
          previewCreditUsed: false,
          previewCreditAvailable: false,
          error: null,
        });
      }
    } catch (err) {
      console.error('Error checking preview credit:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      }));
    }
  }, [user]);

  // Grant preview credit on first login
  const grantPreviewCredit = useCallback(async () => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('grant-preview-credit', {
        body: { userId: user.id },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Refresh state after granting
      await checkPreviewCredit();

      return { success: true, alreadyExists: data.already_exists };
    } catch (err) {
      console.error('Error granting preview credit:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro ao conceder crédito preview',
      };
    }
  }, [user, checkPreviewCredit]);

  useEffect(() => {
    checkPreviewCredit();
  }, [checkPreviewCredit]);

  return {
    ...state,
    refresh: checkPreviewCredit,
    grantPreviewCredit,
  };
}

// Check if an order is a preview order
export function isPreviewOrder(planId: string | null | undefined): boolean {
  return planId === 'preview_test';
}

// Preview credit limitations
export const PREVIEW_LIMITS = {
  allowDownload: true, // Users can download since they have a preview credit
  allowCommercialUse: false,
  structure: ['Verse', 'Chorus'], // Limited to verse + chorus structure
  structureLabel: 'Verso + Refrão',
};
