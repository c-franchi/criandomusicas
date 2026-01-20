import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Emails with full VIP access (no payment required)
const VIP_EMAILS = ['neizao.franchi@gmail.com'];

export const useVIPAccess = (userId: string | undefined, userEmail: string | undefined) => {
  const [isVIP, setIsVIP] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkVIPAccess = async () => {
      if (!userId || !userEmail) {
        setLoading(false);
        return;
      }

      // Check if email is in VIP list
      if (VIP_EMAILS.includes(userEmail.toLowerCase())) {
        setIsVIP(true);
        setLoading(false);
        return;
      }

      // Check if user has admin role
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

        if (!error && data) {
          setIsVIP(true);
        }
      } catch (error) {
        console.error('Error checking VIP access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkVIPAccess();
  }, [userId, userEmail]);

  return { isVIP, loading };
};

// Function to bypass payment for VIP users
export const bypassPaymentForVIP = async (
  orderId: string, 
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'PAID',
        status: 'LYRICS_PENDING',
        voucher_code: 'VIP_ACCESS',
        discount_applied: 0,
      })
      .eq('id', orderId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error bypassing payment:', error);
    return false;
  }
};
