import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Cache for VAPID key
let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    
    if (error) {
      console.error('[Push] Error fetching VAPID key:', error);
      return null;
    }
    
    if (data?.vapidPublicKey) {
      cachedVapidKey = data.vapidPublicKey;
      return cachedVapidKey;
    }
    
    return null;
  } catch (err) {
    console.error('[Push] Failed to fetch VAPID key:', err);
    return null;
  }
}

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
    console.log('[Push] Subscribe called. isSupported:', isSupported, 'user:', !!user);
    
    if (!isSupported || !user) {
      toast({
        title: 'Notificações não disponíveis',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive'
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Fetch VAPID key from backend
      console.log('[Push] Fetching VAPID public key from backend...');
      const vapidPublicKey = await getVapidPublicKey();
      
      if (!vapidPublicKey) {
        console.error('[Push] VAPID_PUBLIC_KEY not configured');
        toast({
          title: 'Erro de configuração',
          description: 'Chave VAPID não configurada. Contate o suporte.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return false;
      }
      
      console.log('[Push] VAPID key fetched successfully, length:', vapidPublicKey.length);
      
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
      
      // Wait for service worker to be ready with timeout
      let registration: ServiceWorkerRegistration;
      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Service Worker timeout')), 10000)
          )
        ]);
      } catch (swError) {
        console.error('[Push] Service worker not ready:', swError);
        toast({
          title: 'Erro no Service Worker',
          description: 'Recarregue a página e tente novamente.',
          variant: 'destructive'
        });
        return false;
      }
      
      console.log('[Push] Service worker ready, scope:', registration.scope);

      // Subscribe to push with better error handling
      console.log('[Push] Subscribing to push manager with VAPID key...');
      
      let applicationServerKey: Uint8Array;
      try {
        applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        console.log('[Push] Converted VAPID key, length:', applicationServerKey.length);
      } catch (keyError) {
        console.error('[Push] Invalid VAPID key format:', keyError);
        toast({
          title: 'Erro de configuração',
          description: 'Chave VAPID inválida. Contate o suporte.',
          variant: 'destructive'
        });
        return false;
      }

      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer
        });
        console.log('[Push] Subscription created:', subscription.endpoint);
      } catch (subError: any) {
        console.error('[Push] Subscription error:', subError);
        
        // Handle specific errors
        if (subError.message?.includes('applicationServerKey')) {
          toast({
            title: 'Erro na chave VAPID',
            description: 'A chave de notificação é inválida. Contate o suporte.',
            variant: 'destructive'
          });
        } else if (subError.name === 'NotAllowedError') {
          toast({
            title: 'Permissão negada',
            description: 'Verifique as configurações do navegador.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Erro ao ativar notificações',
            description: subError.message || 'Tente novamente mais tarde.',
            variant: 'destructive'
          });
        }
        return false;
      }

      const subscriptionJson = subscription.toJSON();
      
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        console.error('[Push] Incomplete subscription data:', subscriptionJson);
        toast({
          title: 'Erro de subscrição',
          description: 'Dados de subscrição incompletos.',
          variant: 'destructive'
        });
        return false;
      }
      
      // Save to database
      console.log('[Push] Saving subscription to database...');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
          is_active: true
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('[Push] Database error:', error);
        throw error;
      }

      console.log('[Push] Subscription saved successfully!');
      setIsSubscribed(true);
      toast({
        title: '🔔 Notificações ativadas!',
        description: 'Você receberá atualizações sobre seus pedidos.'
      });
      return true;
    } catch (error: any) {
      console.error('[Push] General error subscribing to push:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: error.message || 'Tente novamente mais tarde.',
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
