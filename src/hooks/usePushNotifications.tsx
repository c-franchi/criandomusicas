import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Cache da VAPID key
let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-public-key");

    if (error) {
      console.error("[Push] Erro ao buscar VAPID key:", error);
      return null;
    }

    const key = String(data?.vapidPublicKey || "").trim();

    if (!key || key.length < 50) {
      console.error("[Push] VAPID key inválida:", key);
      return null;
    }

    cachedVapidKey = key;
    console.log("[Push] VAPID key carregada, tamanho:", key.length);
    return key;
  } catch (err) {
    console.error("[Push] Falha ao buscar VAPID key:", err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export const usePushNotifications = () => {
  const { t: tu } = useTranslation('uiAccount');
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Verifica suporte do navegador
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Verifica se já existe inscrição ativa
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager.getSubscription();

        if (!subscription) {
          setIsSubscribed(false);
          return;
        }

        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint)
          .eq("is_active", true)
          .maybeSingle();

        setIsSubscribed(!!data);
      } catch (err) {
        console.error("[Push] Erro ao checar subscription:", err);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      toast({
        title: tu('pushUnavailable'),
        description: tu('pushUnsupported'),
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Keep the browser permission prompt inside the user's click, before network waits.
      const permissionResult = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast({
          title: tu('permissionDenied'),
          description: tu('allowNotifications'),
          variant: "destructive",
        });
        return false;
      }

      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) throw new Error(tu('vapidUnavailable'));

      const registration = await navigator.serviceWorker.ready;

      // 🔒 Conversão compatível com o TypeScript do Lovable
      const vapidKeyUint8 = urlBase64ToUint8Array(vapidPublicKey);
      const applicationServerKey = vapidKeyUint8.buffer as ArrayBuffer;

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error(tu('incompleteSubscription'));
      }

      // Deactivate any existing subscriptions with the same endpoint (different users on same device)
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("endpoint", json.endpoint)
        .neq("user_id", user.id);

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          is_active: true,
        },
        { onConflict: "user_id,endpoint" },
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: tu('pushEnabled'),
        description: tu('importantUpdates'),
      });

      return true;
    } catch (err: any) {
      console.error("[Push] Erro ao ativar notificações:", err);
      toast({
        title: tu('pushEnableError'),
        description: err.message || tu('tryAgain'),
        variant: "destructive",
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
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: tu('pushDisabled'),
        description: tu('noMoreNotifications'),
      });

      return true;
    } catch (err) {
      console.error("[Push] Erro ao desativar:", err);
      toast({
        title: tu('pushDisableError'),
        description: tu('tryAgain'),
        variant: "destructive",
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
    unsubscribe,
  };
};
