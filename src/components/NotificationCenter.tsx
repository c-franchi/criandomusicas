import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, Gift, Music, CreditCard, CheckCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: 'credit_transfer' | 'music_ready' | 'payment_approved' | 'general';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface PendingTransfer {
  id: string;
  credits_amount: number;
  transfer_code: string;
  message: string | null;
  from_user_id: string;
  created_at: string;
  sender_name?: string;
}

interface OrderNotification {
  id: string;
  status: string;
  payment_status: string;
  music_ready_at?: string | null;
  updated_at: string;
  song_title: string | null;
}

const DISMISSED_STORAGE_KEY = 'dismissed_notifications';

const getDismissedIds = (): string[] => {
  try {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveDismissedId = (id: string) => {
  const dismissed = getDismissedIds();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    // Keep only last 100 dismissed IDs to prevent storage bloat
    const trimmed = dismissed.slice(-100);
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(trimmed));
  }
};

const NotificationCenter = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);

  useEffect(() => {
    if (user) {
      fetchAllNotifications();
    }
  }, [user]);

  const fetchAllNotifications = async () => {
    if (!user) return;

    try {
      const allNotifications: Notification[] = [];

      // 1. Fetch pending credit transfers
      const { data: transfers } = await supabase
        .from('credit_transfers')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (transfers && transfers.length > 0) {
        // Fetch sender profiles
        const senderIds = [...new Set(transfers.map(t => t.from_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', senderIds);

        transfers.forEach((transfer: PendingTransfer) => {
          const profile = profiles?.find(p => p.user_id === transfer.from_user_id);
          allNotifications.push({
            id: `transfer_${transfer.id}`,
            type: 'credit_transfer',
            title: t('notifications.creditReceived', 'Crédito recebido!'),
            message: profile?.name 
              ? t('notifications.creditFromUser', '{{name}} enviou {{amount}} crédito(s) para você', { name: profile.name, amount: transfer.credits_amount })
              : t('notifications.creditFromSomeone', 'Você recebeu {{amount}} crédito(s)', { amount: transfer.credits_amount }),
            createdAt: transfer.created_at,
            read: false,
            metadata: { 
              transferId: transfer.id, 
              senderName: profile?.name,
              personalMessage: transfer.message,
              amount: transfer.credits_amount
            },
          });
        });
      }

      // 2. Fetch orders with MUSIC_READY status (recent ones in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: readyOrders } = await supabase
        .from('orders')
        .select('id, status, payment_status, music_ready_at, updated_at, song_title')
        .eq('user_id', user.id)
        .eq('status', 'MUSIC_READY')
        .gte('music_ready_at', sevenDaysAgo.toISOString())
        .order('music_ready_at', { ascending: false });

      if (readyOrders) {
        readyOrders.forEach((order: OrderNotification) => {
          allNotifications.push({
            id: `music_${order.id}`,
            type: 'music_ready',
            title: t('notifications.musicReady', 'Música pronta!'),
            message: order.song_title 
              ? t('notifications.musicReadyTitle', 'Sua música "{{title}}" está pronta!', { title: order.song_title })
              : t('notifications.musicReadyGeneric', 'Sua música está pronta para ouvir!'),
            createdAt: order.music_ready_at || order.updated_at,
            read: false,
            actionUrl: `/pedido/${order.id}`,
            metadata: { orderId: order.id },
          });
        });
      }

      // 3. Fetch recently approved payments (last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: paidOrders } = await supabase
        .from('orders')
        .select('id, status, payment_status, updated_at, song_title')
        .eq('user_id', user.id)
        .eq('payment_status', 'PAID')
        .in('status', ['PAID', 'BRIEFING_COMPLETE', 'LYRICS_PENDING', 'LYRICS_GENERATED'])
        .gte('updated_at', threeDaysAgo.toISOString())
        .order('updated_at', { ascending: false });

      if (paidOrders) {
        paidOrders.forEach((order: OrderNotification) => {
          allNotifications.push({
            id: `payment_${order.id}`,
            type: 'payment_approved',
            title: t('notifications.paymentApproved', 'Pagamento aprovado!'),
            message: t('notifications.paymentApprovedDesc', 'Seu pagamento foi confirmado e estamos criando sua música.'),
            createdAt: order.updated_at,
            read: false,
            actionUrl: `/pedido/${order.id}`,
            metadata: { orderId: order.id },
          });
        });
      }

      // Sort all notifications by date
      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Filter out dismissed notifications (except credit transfers which are handled by DB status)
      const currentDismissed = getDismissedIds();
      const filtered = allNotifications.filter(n => 
        n.type === 'credit_transfer' || !currentDismissed.includes(n.id)
      );

      setNotifications(filtered);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTransfer = async (transferId: string) => {
    setAccepting(transferId);
    try {
      const { error } = await supabase.functions.invoke('accept-credit-transfer', {
        body: { transferId, action: 'accept' },
      });

      if (error) throw error;

      toast({
        title: '🎉 ' + t('notifications.creditAccepted', 'Crédito aceito!'),
        description: t('notifications.creditAcceptedDesc', 'O crédito foi adicionado à sua conta.'),
      });

      // Remove from notifications
      setNotifications(prev => prev.filter(n => n.metadata?.transferId !== transferId));
    } catch (error) {
      console.error('Error accepting transfer:', error);
      toast({
        title: t('notifications.errorTitle', 'Erro'),
        description: t('notifications.errorAccepting', 'Não foi possível aceitar o crédito.'),
        variant: 'destructive',
      });
    } finally {
      setAccepting(null);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setOpen(false);
    }
  };

  const dismissNotification = (notificationId: string, notificationType: Notification['type']) => {
    // For non-credit notifications, persist the dismissal
    if (notificationType !== 'credit_transfer') {
      saveDismissedId(notificationId);
      setDismissedIds(prev => [...prev, notificationId]);
    }
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'credit_transfer':
        return <Gift className="w-4 h-4 text-primary" />;
      case 'music_ready':
        return <Music className="w-4 h-4 text-green-500" />;
      case 'payment_approved':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNotificationBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'credit_transfer':
        return 'bg-primary/10 border-primary/20';
      case 'music_ready':
        return 'bg-green-500/10 border-green-500/20';
      case 'payment_approved':
        return 'bg-blue-500/10 border-blue-500/20';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.justNow', 'Agora');
    if (diffMins < 60) return t('notifications.minutesAgo', '{{count}}min atrás', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', '{{count}}h atrás', { count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', '{{count}}d atrás', { count: diffDays });
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.length;

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative hover:scale-105 transition-transform rounded-xl"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0 animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">
            {t('notifications.title', 'Notificações')}
          </h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} {unreadCount === 1 ? t('notifications.new', 'nova') : t('notifications.newPlural', 'novas')}
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Bell className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('notifications.empty', 'Nenhuma notificação no momento')}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative p-3 rounded-lg border ${getNotificationBgColor(notification.type)} transition-all hover:shadow-sm`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-50 hover:opacity-100"
                    onClick={() => dismissNotification(notification.id, notification.type)}
                  >
                    <X className="w-3 h-3" />
                  </Button>

                  <div className="flex items-start gap-3 pr-6">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      {/* Show personal message for credit transfers */}
                      {notification.type === 'credit_transfer' && notification.metadata?.personalMessage && (
                        <p className="text-xs italic text-primary/80 mt-1">
                          "{notification.metadata.personalMessage as string}"
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </span>
                        
                        {notification.type === 'credit_transfer' && notification.metadata?.transferId && (
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleAcceptTransfer(notification.metadata?.transferId as string)}
                            disabled={accepting === notification.metadata?.transferId}
                          >
                            {accepting === notification.metadata?.transferId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {t('notifications.accept', 'Aceitar')}
                              </>
                            )}
                          </Button>
                        )}

                        {notification.actionUrl && notification.type !== 'credit_transfer' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            {t('notifications.view', 'Ver')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
