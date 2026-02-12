import { useState, useEffect, useCallback, useMemo } from "react";
import { Navigate, Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Music, User, Settings, Download, Trash2, Home, Mic, Piano, Edit3, Zap, Headphones } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBanner } from "@/components/PushNotificationPrompt";
import { useCredits } from "@/hooks/useCredits";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "react-i18next";
import RegionSelector from "@/components/RegionSelector";
import { StyledTabs, StyledTabsContent, StyledTabsList, StyledTabsTrigger } from "@/components/dashboard/StyledTabs";
import { OrderAccordion } from "@/components/dashboard/OrderAccordion";
import ReceivedCreditsNotification from "@/components/ReceivedCreditsNotification";
import { OrderProcessingService } from "@/services/OrderProcessingService";
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
  plan_id?: string;
  is_preview?: boolean;
}

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { toast } = useToast();
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [stuckOrderIds, setStuckOrderIds] = useState<Set<string>>(new Set());
  const { totalVocal, totalInstrumental } = useCredits();

  // Filter orders by type
  const vocalOrders = useMemo(() => 
    orders.filter(o => !o.is_instrumental && !o.has_custom_lyric), [orders]);
  const instrumentalOrders = useMemo(() => 
    orders.filter(o => o.is_instrumental), [orders]);
  const customLyricOrders = useMemo(() => 
    orders.filter(o => o.has_custom_lyric && !o.is_instrumental), [orders]);

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
      // Creator plan credits - from pricing_config table
      const planCredits: Record<string, number> = {
        'creator_start': 40,
        'creator_pro': 150,
        'creator_studio': 230,
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
      // Only update status to CANCELLED instead of deleting — credits must NOT be returned
      const { error } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED' })
        .eq('id', deleteOrderId);

      if (error) throw error;

      toast({
        title: t('toasts.deleteSuccess'),
        description: t('toasts.deleteSuccessDesc'),
      });

      setOrders(prev => prev.map(o => 
        o.id === deleteOrderId ? { ...o, status: 'CANCELLED' } : o
      ));
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
        .select('id, status, payment_status, created_at, music_type, music_style, story, approved_lyric_id, amount, is_instrumental, has_custom_lyric, song_title, plan_id, is_preview')
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

  // Detect stuck orders (PAID/LYRICS_PENDING with 0 lyrics)
  const detectStuckOrders = useCallback(async (ordersList: Order[]) => {
    const potentiallyStuck = ordersList.filter(
      o => ['PAID', 'LYRICS_PENDING'].includes(o.status || '') && !o.is_instrumental
    );
    if (potentiallyStuck.length === 0) {
      setStuckOrderIds(new Set());
      return;
    }

    const stuckIds = new Set<string>();
    await Promise.all(
      potentiallyStuck.map(async (order) => {
        const { count } = await supabase
          .from('lyrics')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', order.id);
        
        if ((count ?? 0) === 0) {
          // Check if order is older than 3 minutes (give time for generation)
          const createdAt = new Date(order.created_at || '');
          const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
          if (createdAt < threeMinutesAgo) {
            stuckIds.add(order.id);
          }
        }
      })
    );
    setStuckOrderIds(stuckIds);
  }, []);

  // Retry handler for stuck orders
  const handleRetryOrder = useCallback(async (orderId: string) => {
    try {
      const result = await OrderProcessingService.retryLyricsGeneration(orderId);
      
      if (result.success) {
        toast({
          title: '✅ Letras geradas!',
          description: 'As letras foram geradas com sucesso.',
        });
        // Remove from stuck set
        setStuckOrderIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
        
        if (result.action === 'create-song') {
          navigate(`/criar-musica?orderId=${orderId}`);
        }
      } else {
        toast({
          title: 'Erro ao reprocessar',
          description: result.error || 'Tente novamente em alguns instantes.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Retry failed:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível reprocessar. Tente novamente.',
        variant: 'destructive',
      });
    }
  }, [toast, navigate]);

  // Initial fetch
  useEffect(() => {
    if (!loading && !user) {
      setShouldRedirect(true);
    } else if (user) {
      fetchOrders().then(() => {
        // Detect stuck orders after fetching
      });
    }
  }, [user, loading, fetchOrders]);

  // Detect stuck orders whenever orders change
  useEffect(() => {
    if (orders.length > 0) {
      detectStuckOrders(orders);
    }
  }, [orders, detectStuckOrders]);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Notification Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <NotificationBanner />
          <ReceivedCreditsNotification variant="banner" />
        </motion.div>

        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="shrink-0"
              >
                <Music className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </motion.div>
              <h1 className="text-xl sm:text-3xl font-bold gradient-text truncate">{t('title')}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
            <Button 
              variant="default" 
              size="sm" 
              asChild 
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white h-8 sm:h-10 px-3 sm:px-4"
            >
              <Link to="/briefing?type=vocal">
                <Zap className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{t('buttons.quickCreate')}</span>
                <span className="sm:hidden">Criar</span>
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild title={t('buttons.home')} className="hover:scale-105 transition-transform h-8 w-8 sm:h-10 sm:w-10">
              <Link to="/">
                <Home className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild title={t('buttons.install')} className="hover:scale-105 transition-transform h-8 w-8 sm:h-10 sm:w-10">
              <Link to="/install">
                <Download className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild className="hover:scale-105 transition-transform h-8 w-8 sm:h-10 sm:w-10">
              <Link to="/perfil" title={t('buttons.profile')}>
                <User className="w-4 h-4" />
              </Link>
            </Button>
            <RegionSelector variant="compact" />
            <ThemeToggle />
            {isAdmin && (
              <Button variant="outline" size="icon" asChild className="hover:scale-105 transition-transform h-8 w-8 sm:h-10 sm:w-10">
                <Link to="/admin" title={t('buttons.admin')}>
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Tabs for order types */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StyledTabs defaultValue="vocal" className="w-full">
            <StyledTabsList className="grid w-full grid-cols-4 mb-6">
              <StyledTabsTrigger value="vocal" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Mic className="w-4 h-4" />
                <span className="hidden xs:inline">{t('tabs.vocal')}</span>
                <span className="xs:hidden">Vocal</span>
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {vocalOrders.length}
                </Badge>
              </StyledTabsTrigger>
              <StyledTabsTrigger value="instrumental" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Piano className="w-4 h-4" />
                <span className="hidden xs:inline">{t('tabs.instrumental')}</span>
                <span className="xs:hidden">Instrum.</span>
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {instrumentalOrders.length}
                </Badge>
              </StyledTabsTrigger>
              <StyledTabsTrigger value="custom" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Edit3 className="w-4 h-4" />
                <span className="hidden xs:inline">{t('tabs.customLyric')}</span>
                <span className="xs:hidden">Própria</span>
                <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                  {customLyricOrders.length}
                </Badge>
              </StyledTabsTrigger>
              <StyledTabsTrigger value="audio" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Headphones className="w-4 h-4" />
                <span className="hidden xs:inline">Áudio</span>
                <span className="xs:hidden">🎤</span>
                <Badge className="ml-1 text-[10px] px-1 bg-emerald-500 text-white border-0">
                  Novo
                </Badge>
              </StyledTabsTrigger>
            </StyledTabsList>

            {/* Vocal Tab */}
            <StyledTabsContent value="vocal" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/briefing?type=vocal">
                    <Mic className="w-4 h-4 mr-2" />
                    {t('buttons.createVocal')}
                    {totalVocal > 0 && (
                      <Badge className="ml-2 bg-white/90 dark:bg-green-500/20 text-green-800 dark:text-green-400 border border-green-600/50 dark:border-green-500/30 font-semibold">
                        {totalVocal} {t('tabs.creditsAvailable')}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
              
              {vocalOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <Mic className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t('empty.vocalTitle')}</h3>
                  <p className="text-muted-foreground mb-4">{t('empty.vocalSubtitle')}</p>
                  <Button asChild>
                    <Link to="/briefing?type=vocal">{t('buttons.createVocal')}</Link>
                  </Button>
                </Card>
              ) : (
                <OrderAccordion 
                  orders={vocalOrders}
                  t={t}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  setDeleteOrderId={setDeleteOrderId}
                  stuckOrderIds={stuckOrderIds}
                  onRetryOrder={handleRetryOrder}
                />
              )}
            </StyledTabsContent>

            {/* Instrumental Tab */}
            <StyledTabsContent value="instrumental" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/briefing?type=instrumental">
                    <Piano className="w-4 h-4 mr-2" />
                    {t('buttons.createInstrumental')}
                    {totalInstrumental > 0 && (
                      <Badge className="ml-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
                        {totalInstrumental} {t('tabs.creditsAvailable')}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
              
              {instrumentalOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <Piano className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t('empty.instrumentalTitle')}</h3>
                  <p className="text-muted-foreground mb-4">{t('empty.instrumentalSubtitle')}</p>
                  <Button asChild>
                    <Link to="/briefing?type=instrumental">{t('buttons.createInstrumental')}</Link>
                  </Button>
                </Card>
              ) : (
                <OrderAccordion 
                  orders={instrumentalOrders}
                  t={t}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  setDeleteOrderId={setDeleteOrderId}
                />
              )}
            </StyledTabsContent>

            {/* Custom Lyric Tab */}
            <StyledTabsContent value="custom" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/briefing?type=custom_lyric">
                    <Edit3 className="w-4 h-4 mr-2" />
                    {t('buttons.createCustomLyric')}
                    {totalVocal > 0 && (
                      <Badge className="ml-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        {totalVocal} {t('tabs.creditsAvailable')}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
              
              {customLyricOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <Edit3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t('empty.customTitle')}</h3>
                  <p className="text-muted-foreground mb-4">{t('empty.customSubtitle')}</p>
                  <Button asChild>
                    <Link to="/briefing?type=custom_lyric">{t('buttons.createCustomLyric')}</Link>
                  </Button>
                </Card>
              ) : (
                <OrderAccordion 
                  orders={customLyricOrders}
                  t={t}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  setDeleteOrderId={setDeleteOrderId}
                  stuckOrderIds={stuckOrderIds}
                  onRetryOrder={handleRetryOrder}
                />
              )}
            </StyledTabsContent>

            {/* Audio Mode Tab */}
            <StyledTabsContent value="audio" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <Button asChild className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                  <Link to="/briefing?mode=audio">
                    <Headphones className="w-4 h-4 mr-2" />
                    {t('buttons.createAudio', 'Criar por Áudio')}
                  </Link>
                </Button>
              </div>
              
              <Card className="p-8 text-center">
                <Headphones className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">🎤 Modo Áudio</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Grave ou envie um áudio cantando um trecho e nossa IA transcreve e gera uma letra completa com qualidade profissional.
                </p>
                <div className="flex flex-wrap gap-2 justify-center text-sm text-muted-foreground mb-6">
                  <Badge variant="outline" className="gap-1">
                    <Mic className="w-3 h-3" /> Grave ou envie áudio
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Edit3 className="w-3 h-3" /> Transcrição automática
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Music className="w-3 h-3" /> Letra profissional completa
                  </Badge>
                </div>
                <Button asChild>
                  <Link to="/briefing?mode=audio">Experimentar agora</Link>
                </Button>
              </Card>
            </StyledTabsContent>
          </StyledTabs>
        </motion.div>

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