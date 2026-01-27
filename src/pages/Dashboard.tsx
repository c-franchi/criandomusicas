import { useState, useEffect, useCallback } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Music, User, Settings, Bell, Download, RefreshCw, Trash2, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBanner } from "@/components/PushNotificationPrompt";
import CreditsBanner from "@/components/CreditsBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "react-i18next";
import RegionSelector from "@/components/RegionSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Order {
  id: string;
  status?: string;
  payment_status?: string;
  created_at?: string;
  music_type?: string;
  music_style?: string;
  story?: string;
  approved_lyric_id?: string;
  lyric_title?: string;
  amount?: number;
  is_instrumental?: boolean;
  has_custom_lyric?: boolean;
  song_title?: string;
}

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { toast } = useToast();
  const { t } = useTranslation(['dashboard', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  // Handle subscription success query param
  useEffect(() => {
    const subscriptionSuccess = searchParams.get('subscription');
    const planId = searchParams.get('plan');

    if (subscriptionSuccess === 'success') {
      // Get plan name for display
      const planNames: Record<string, string> = {
        'creator_start': 'Creator Start',
        'creator_pro': 'Creator Pro',
        'creator_studio': 'Creator Studio',
        'creator_start_instrumental': 'Creator Start Instrumental',
        'creator_pro_instrumental': 'Creator Pro Instrumental',
        'creator_studio_instrumental': 'Creator Studio Instrumental',
      };
      
      const planCredits: Record<string, number> = {
        'creator_start': 50,
        'creator_pro': 150,
        'creator_studio': 300,
        'creator_start_instrumental': 50,
        'creator_pro_instrumental': 150,
        'creator_studio_instrumental': 300,
      };
      
      const planPrices: Record<string, number> = {
        'creator_start': 2990,
        'creator_pro': 4990,
        'creator_studio': 7990,
        'creator_start_instrumental': 2390,
        'creator_pro_instrumental': 3990,
        'creator_studio_instrumental': 6390,
      };
      
      const planName = planId ? planNames[planId] || 'Creator' : 'Creator';

      toast({
        title: t('toasts.subscriptionSuccess'),
        description: t('toasts.subscriptionDesc', { plan: planName }),
      });

      // Send purchase confirmation email for subscription
      if (planId && user?.email) {
        const sendSubscriptionEmail = async () => {
          try {
            const renewalDate = new Date();
            renewalDate.setMonth(renewalDate.getMonth() + 1);
            
            await supabase.functions.invoke('send-purchase-email', {
              body: {
                email: user.email,
                userName: profile?.name || 'Cliente',
                purchaseType: 'subscription',
                planName,
                amount: planPrices[planId] || 2990,
                currency: 'brl',
                credits: planCredits[planId] || 50,
                isInstrumental: planId.includes('instrumental'),
                renewalDate: renewalDate.toLocaleDateString('pt-BR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }),
              }
            });
            console.log('Subscription confirmation email sent');
          } catch (error) {
            console.error('Failed to send subscription email:', error);
          }
        };
        sendSubscriptionEmail();
      }

      // Clear URL params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, user?.email, profile?.name]);

  const confirmDeleteOrder = async () => {
    if (!deleteOrderId) return;
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', deleteOrderId);

      if (error) throw error;

      toast({
        title: t('toasts.deleteSuccess'),
        description: t('toasts.deleteSuccessDesc'),
      });

      setOrders(prev => prev.filter(o => o.id !== deleteOrderId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: t('toasts.deleteError'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeleteOrderId(null);
    }
  };

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, payment_status, created_at, music_type, music_style, story, approved_lyric_id, amount, is_instrumental, has_custom_lyric, song_title')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lyric titles for orders with approved lyrics
      const ordersWithTitles = await Promise.all(
        (data || []).map(async (order) => {
          let lyric_title = null;
          if (order.approved_lyric_id) {
            const { data: lyricData } = await supabase
              .from('lyrics')
              .select('title')
              .eq('id', order.approved_lyric_id)
              .maybeSingle();
            lyric_title = lyricData?.title;
          }
          return { ...order, lyric_title };
        })
      );

      setOrders(ordersWithTitles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: t('toasts.loadError'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id, toast]);

  // Initial fetch
  useEffect(() => {
    if (!loading && !user) {
      setShouldRedirect(true);
    } else if (user) {
      fetchOrders();
    }
  }, [user, loading, fetchOrders]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Order change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            
            // CORREÇÃO: Verificar se o pedido já existe antes de adicionar
            setOrders(prev => {
              const exists = prev.some(o => o.id === newOrder.id);
              if (exists) {
                console.log('Order already exists, skipping INSERT:', newOrder.id);
                return prev;
              }
              
              // Fetch lyric title async and update
              (async () => {
                let lyric_title = null;
                if (newOrder.approved_lyric_id) {
                  const { data: lyricData } = await supabase
                    .from('lyrics')
                    .select('title')
                    .eq('id', newOrder.approved_lyric_id)
                    .maybeSingle();
                  lyric_title = lyricData?.title;
                  // Update with title after async fetch
                  setOrders(p => p.map(o => o.id === newOrder.id ? { ...o, lyric_title } : o));
                }
              })();
              
              return [{ ...newOrder, lyric_title: null }, ...prev];
            });
            toast({
              title: t('toasts.newOrder'),
              description: t('toasts.newOrderDesc'),
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            // Fetch lyric title if available
            let lyric_title = null;
            if (updatedOrder.approved_lyric_id) {
              const { data: lyricData } = await supabase
                .from('lyrics')
                .select('title')
                .eq('id', updatedOrder.approved_lyric_id)
                .maybeSingle();
              lyric_title = lyricData?.title;
            }
            setOrders(prev => prev.map(o => 
              o.id === updatedOrder.id ? { ...updatedOrder, lyric_title } : o
            ));
            
            // Show toast for important status changes
            if (updatedOrder.status === 'LYRICS_GENERATED') {
              toast({
                title: t('toasts.lyricsReady'),
                description: t('toasts.lyricsReadyDesc'),
              });
            } else if (updatedOrder.status === 'MUSIC_READY') {
              toast({
                title: t('toasts.musicReady'),
                description: t('toasts.musicReadyDesc'),
              });
            } else if (updatedOrder.payment_status === 'PAID') {
              toast({
                title: t('toasts.paymentConfirmed'),
                description: t('toasts.paymentConfirmedDesc'),
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Order).id;
            setOrders(prev => prev.filter(o => o.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  if (shouldRedirect) {
    return <Navigate to="/auth" replace />;
  }

  // Status text function that considers if order is instrumental
  const getStatusText = (status: string, isInstrumental?: boolean) => {
    // For instrumental orders, use different labels for certain statuses
    if (isInstrumental) {
      const instrumentalKey = `statusesInstrumental.${status}`;
      const instrumentalTranslation = t(instrumentalKey, { defaultValue: '' });
      if (instrumentalTranslation) return instrumentalTranslation;
    }
    return t(`statuses.${status}`, { defaultValue: status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
        return 'bg-orange-600 dark:bg-orange-500/20 text-white dark:text-orange-300 border-orange-600 dark:border-orange-500/30';
      case 'PAID':
      case 'LYRICS_GENERATED':
        return 'bg-blue-600 dark:bg-blue-500/20 text-white dark:text-blue-300 border-blue-600 dark:border-blue-500/30';
      case 'LYRICS_APPROVED':
        return 'bg-purple-600 dark:bg-purple-500/20 text-white dark:text-purple-300 border-purple-600 dark:border-purple-500/30';
      case 'MUSIC_GENERATING':
        return 'bg-yellow-500 dark:bg-yellow-500/20 text-yellow-900 dark:text-yellow-300 border-yellow-500 dark:border-yellow-500/30';
      case 'MUSIC_READY':
      case 'COMPLETED':
        return 'bg-green-600 dark:bg-green-500/20 text-white dark:text-green-300 border-green-600 dark:border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }
    }
  };

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Notification Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <NotificationBanner />
        </motion.div>

        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Music className="w-8 h-8 text-primary" />
              </motion.div>
              <h1 className="text-3xl font-bold gradient-text">{t('title')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild title={t('buttons.home')} className="hover:scale-105 transition-transform">
              <Link to="/">
                <Home className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild title={t('buttons.install')} className="hover:scale-105 transition-transform">
              <Link to="/install">
                <Download className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild className="hover:scale-105 transition-transform">
              <Link to="/perfil" title={t('buttons.profile')}>
                <User className="w-4 h-4" />
              </Link>
            </Button>
            <RegionSelector variant="compact" />
            <ThemeToggle />
            {isAdmin && (
              <Button variant="outline" size="icon" asChild className="hover:scale-105 transition-transform">
                <Link to="/admin" title={t('buttons.admin')}>
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Credits Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <CreditsBanner className="mb-6" />
        </motion.div>

        {/* New Order Button */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Button asChild size="lg" className="hover:scale-105 transition-transform shadow-lg hover:shadow-primary/25">
            <Link to="/briefing">
              <Music className="w-4 h-4 mr-2" />
              {t('buttons.newSong')}
            </Link>
          </Button>
        </motion.div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="p-8 text-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">{t('empty.title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('empty.subtitle')}
                </p>
                <Button asChild className="hover:scale-105 transition-transform">
                  <Link to="/briefing">{t('empty.cta')}</Link>
                </Button>
              </Card>
            </motion.div>
          ) : (
            orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <Link to={`/pedido/${order.id}`} className="block group">
                  <Card className="p-4 sm:p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                  {/* Mobile-first layout */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 break-words text-foreground group-hover:text-primary transition-colors">
                        {order.song_title || order.lyric_title || `Música ${order.music_type || 'Personalizada'}`}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {order.music_style || 'Estilo'} • {order.music_type || 'Tipo'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getStatusColor(order.status || 'DRAFT')}>
                          {getStatusText(order.status || 'DRAFT', order.is_instrumental)}
                        </Badge>
                        {order.has_custom_lyric && (
                          <Badge variant="outline" className="text-xs border-amber-600 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-transparent">
                            {t('badges.customLyric')}
                          </Badge>
                        )}
                        {order.is_instrumental && !order.has_custom_lyric && (
                          <Badge variant="outline" className="text-xs border-purple-600 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-transparent">
                            {t('badges.instrumental')}
                          </Badge>
                        )}
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t('order.createdAt', { date: order.created_at ? new Date(order.created_at).toLocaleDateString() : '' })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Price and actions - stacks on mobile */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0">
                      <div className="text-xl sm:text-2xl font-bold text-primary">
                        R$ {((order.amount || 0) / 100).toFixed(2).replace('.', ',')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="pointer-events-none">
                          <span className="hidden xs:inline">{t('order.view').split(' ')[0]} </span>{t('order.view').split(' ').slice(1).join(' ') || t('order.view')}
                          <ExternalLink className="w-4 h-4 ml-1 sm:ml-2" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteOrderId(order.id);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={t('order.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {order.story && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2 text-sm">{t('dashboard:orderDetails.briefingFields.story')}:</h4>
                      <p className="text-sm text-muted-foreground break-words">
                        {order.story.slice(0, 150)}
                        {order.story.length > 150 ? '...' : ''}
                      </p>
                    </div>
                  )}
                </Card>
              </Link>
              </motion.div>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteDialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('deleteDialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Dashboard;