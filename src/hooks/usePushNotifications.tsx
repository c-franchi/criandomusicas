import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// VAPID Public Key - This is a PUBLIC key and safe to expose in client code
// The key is used to identify the application server when subscribing to push notifications
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BLB5eaVrCH-QK6JddCPfdVBMVgDVxiRz1FEbqn_vPXP3d4i0Pl4N5QIYBBkYMOVmPXPc2_cNKD-WZnRTvqMaK8A';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Verify subscription exists in database
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .eq('is_active', true)
            .maybeSingle();
          
          setIsSubscribed(!!data);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    console.log('[Push] Subscribe called. isSupported:', isSupported, 'user:', !!user, 'VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY ? 'SET' : 'MISSING');
    
    if (!isSupported || !user) {
      toast({
        title: 'Notificações não disponíveis',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive'
      });
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] VITE_VAPID_PUBLIC_KEY not configured in environment');
      toast({
        title: 'Erro de configuração',
        description: 'Chave VAPID não configurada. Contate o suporte.',
        variant: 'destructive'
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission
      console.log('[Push] Requesting notification permission...');
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      console.log('[Push] Permission result:', permissionResult);

      if (permissionResult !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'Você precisa permitir notificações para receber atualizações.',
          variant: 'destructive'
        });
        return false;
      }

      // Get service worker registration
      console.log('[Push] Getting service worker registration...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready');

      // Subscribe to push
      console.log('[Push] Subscribing to push manager with VAPID key...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });
      console.log('[Push] Subscription created:', subscription.endpoint);

      const subscriptionJson = subscription.toJSON();
      
      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
          is_active: true
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: '🔔 Notificações ativadas!',
        description: 'Você receberá atualizações sobre seus pedidos.'
      });
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Deactivate in database
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações push.'
      });
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Erro ao desativar notificações',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
};
