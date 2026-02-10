import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Cache for VAPID key
let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-public-key");

    if (error) {
      console.error("[Push] Error fetching VAPID key:", error);
      return null;
    }

    const key = String(data?.vapidPublicKey || "").trim();

    if (!key || key.length < 50) {
      console.error("[Push] Invalid VAPID key:", key);
      return null;
    }

    cachedVapidKey = key;
    console.log("[Push] VAPID key loaded, length:", key.length);
    return key;
  } catch (err) {
    console.error("[Push] Failed to fetch VAPID key:", err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

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
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Check browser support
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

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
        console.error("[Push] Error checking subscription:", err);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      toast({
        title: "Notificações indisponíveis",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const vapidPublicKey = await getVapidPublicKey();

      if (!vapidPublicKey) {
        toast({
          title: "Erro de configuração",
          description: "Chave VAPID inválida ou ausente.",
          variant: "destructive",
        });
        return false;
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações.",
          variant: "destructive",
        });
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey, // ⚠️ NÃO usar .buffer
      });

      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Incomplete subscription data");
      }

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
        title: "🔔 Notificações ativadas",
        description: "Você receberá atualizações importantes.",
      });

      return true;
    } catch (err: any) {
      console.error("[Push] Subscribe error:", err);
      toast({
        title: "Erro ao ativar notificações",
        description: err.message || "Tente novamente.",
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
      const subscription = await registration.pushManager.getSubscription();

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
        title: "Notificações desativadas",
        description: "Você não receberá mais notificações.",
      });

      return true;
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
      toast({
        title: "Erro ao desativar",
        description: "Tente novamente.",
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
