import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const PushNotificationPrompt = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Show prompt after 3 seconds if user is logged in and hasn't subscribed
    if (user && isSupported && !isSubscribed && permission !== 'denied') {
      const dismissedKey = `push_prompt_dismissed_${user.id}`;
      const wasDismissed = localStorage.getItem(dismissedKey);
      
      if (!wasDismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isSupported, isSubscribed, permission]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    if (user) {
      localStorage.setItem(`push_prompt_dismissed_${user.id}`, 'true');
    }
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
  };

  if (!showPrompt || dismissed || !isSupported || isSubscribed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4">
      <Card className="p-4 bg-card/95 backdrop-blur-lg border-primary/30 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">Ativar notificações?</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Receba atualizações sobre seus pedidos de música diretamente no seu dispositivo.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSubscribe}
                disabled={isLoading}
                className="text-xs"
              >
                {isLoading ? 'Ativando...' : 'Ativar'}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-xs"
              >
                Agora não
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const NotificationToggle = () => {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant={isSubscribed ? 'default' : 'outline'}
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <Bell className="w-4 h-4" />
          Notificações Ativas
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4" />
          Ativar Notificações
        </>
      )}
    </Button>
  );
};

// Banner component for Dashboard
export const NotificationBanner = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!user || !isSupported || isSubscribed || permission === 'denied' || dismissed) {
    return null;
  }

  // Check if banner was dismissed recently (24h)
  const dismissedKey = `notification_banner_dismissed_${user.id}`;
  const dismissedAt = localStorage.getItem(dismissedKey);
  if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(dismissedKey, Date.now().toString());
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <Card className="mb-6 p-4 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">Ative as notificações</h4>
          <p className="text-xs text-muted-foreground">
            Seja notificado quando sua música estiver pronta!
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? 'Ativando...' : 'Ativar'}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
