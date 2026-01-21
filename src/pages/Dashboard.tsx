import { useState, useEffect, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Music, User, Settings, Bell, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBanner } from "@/components/PushNotificationPrompt";

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
}

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, payment_status, created_at, music_type, music_style, story, approved_lyric_id, amount')
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
        title: 'Erro ao carregar pedidos',
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
            // Fetch lyric title if available
            let lyric_title = null;
            if (newOrder.approved_lyric_id) {
              const { data: lyricData } = await supabase
                .from('lyrics')
                .select('title')
                .eq('id', newOrder.approved_lyric_id)
                .maybeSingle();
              lyric_title = lyricData?.title;
            }
            setOrders(prev => [{ ...newOrder, lyric_title }, ...prev]);
            toast({
              title: '🎵 Novo pedido criado!',
              description: 'Seu pedido foi adicionado à lista.',
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
                title: '✨ Letras prontas!',
                description: 'As letras da sua música foram geradas.',
              });
            } else if (updatedOrder.status === 'MUSIC_READY') {
              toast({
                title: '🎵 Música pronta!',
                description: 'Sua música está disponível para download!',
              });
            } else if (updatedOrder.payment_status === 'PAID') {
              toast({
                title: '✅ Pagamento confirmado!',
                description: 'Estamos gerando as letras da sua música.',
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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'DRAFT': 'Rascunho',
      'AWAITING_PAYMENT': 'Aguardando Pagamento',
      'PAID': 'Pago',
      'BRIEFING_COMPLETE': 'Briefing Completo',
      'LYRICS_PENDING': 'Gerando Letras',
      'LYRICS_GENERATED': 'Letras Geradas',
      'LYRICS_APPROVED': 'Letras Aprovadas',
      'MUSIC_GENERATING': 'Em Produção',
      'MUSIC_READY': 'Música Pronta',
      'COMPLETED': 'Entregue',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'PAID':
      case 'LYRICS_GENERATED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'LYRICS_APPROVED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'MUSIC_GENERATING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'MUSIC_READY':
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando seus pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Notification Banner */}
        <NotificationBanner />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Music className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Meus Pedidos</h1>
            </div>
            <p className="text-muted-foreground">
              Acompanhe suas músicas personalizadas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild title="Instalar App">
              <Link to="/install">
                <Download className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link to="/perfil" title="Meu Perfil">
                <User className="w-4 h-4" />
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="outline" size="icon" asChild>
                <Link to="/admin" title="Painel Admin">
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* New Order Button */}
        <div className="mb-8 text-center">
          <Button asChild size="lg">
            <Link to="/briefing">
              <Music className="w-4 h-4 mr-2" />
              Criar Nova Música
            </Link>
          </Button>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card className="p-8 text-center">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum pedido ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira música personalizada
              </p>
              <Button asChild>
                <Link to="/briefing">Começar Agora</Link>
              </Button>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {order.lyric_title || `Música ${order.music_type || 'Personalizada'}`}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {order.music_style || 'Estilo'} • {order.music_type || 'Tipo'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status || 'DRAFT')}>
                        {getStatusText(order.status || 'DRAFT')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Criado em {order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary mb-1">
                      R$ {((order.amount || 999) / 100).toFixed(2).replace('.', ',')}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/pedido/${order.id}`}>
                        Ver Detalhes
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
                
                {order.story && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">História:</h4>
                    <p className="text-sm text-muted-foreground">
                      {order.story.slice(0, 150)}
                      {order.story.length > 150 ? '...' : ''}
                    </p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;