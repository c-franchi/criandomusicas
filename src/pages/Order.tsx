import { useState, useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  CreditCard, 
  Music, 
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OrderData {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  music_type: string;
  music_style: string;
  story: string;
  approved_lyric_id: string | null;
  amount: number;
  lyric_title?: string;
}

const Order = () => {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user?.id || !orderId) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        // Fetch lyric title if approved
        let lyric_title = null;
        if (data?.approved_lyric_id) {
          const { data: lyricData } = await supabase
            .from('lyrics')
            .select('title')
            .eq('id', data.approved_lyric_id)
            .maybeSingle();
          lyric_title = lyricData?.title;
        }

        setOrder({ ...data, lyric_title });
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrder();
    }
  }, [user, orderId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id || !orderId) return;

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          console.log('Order updated:', payload);
          const newData = payload.new as OrderData;
          
          let lyric_title = null;
          if (newData?.approved_lyric_id) {
            const { data: lyricData } = await supabase
              .from('lyrics')
              .select('title')
              .eq('id', newData.approved_lyric_id)
              .maybeSingle();
            lyric_title = lyricData?.title;
          }

          setOrder({ ...newData, lyric_title });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, orderId]);

  const handlePayment = async () => {
    if (!orderId) return;

    setProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { orderId }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('URL de pagamento não recebida');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast({
        title: 'Erro ao processar pagamento',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setProcessingPayment(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!order) {
    return <Navigate to="/dashboard" replace />;
  }

  const getStatusInfo = () => {
    switch (order.status) {
      case 'DRAFT':
        return { text: 'Rascunho', progress: 10, icon: Clock, color: 'text-muted-foreground' };
      case 'AWAITING_PAYMENT':
        return { text: 'Aguardando Pagamento', progress: 20, icon: CreditCard, color: 'text-orange-500' };
      case 'PAID':
        return { text: 'Pago - Gerando Letras', progress: 35, icon: Clock, color: 'text-blue-500' };
      case 'LYRICS_PENDING':
        return { text: 'Gerando Letras...', progress: 40, icon: Clock, color: 'text-blue-500' };
      case 'LYRICS_GENERATED':
        return { text: 'Letras Prontas', progress: 50, icon: CheckCircle, color: 'text-purple-500' };
      case 'LYRICS_APPROVED':
        return { text: 'Letras Aprovadas', progress: 60, icon: CheckCircle, color: 'text-green-500' };
      case 'MUSIC_GENERATING':
        return { text: 'Produzindo Música...', progress: 80, icon: Music, color: 'text-yellow-500' };
      case 'MUSIC_READY':
        return { text: 'Música Pronta!', progress: 95, icon: CheckCircle, color: 'text-green-600' };
      case 'COMPLETED':
        return { text: 'Concluído', progress: 100, icon: CheckCircle, color: 'text-green-600' };
      default:
        return { text: 'Em andamento', progress: 0, icon: Clock, color: 'text-muted-foreground' };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Meus Pedidos
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {order.lyric_title || `Música ${order.music_type}`}
          </h1>
          <p className="text-muted-foreground">
            Pedido #{order.id.slice(0, 8)} • {order.music_style}
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{statusInfo.text}</h3>
              <p className="text-sm text-muted-foreground">
                {order.status === 'AWAITING_PAYMENT' && 'Complete o pagamento para iniciar a produção'}
                {order.status === 'MUSIC_GENERATING' && 'Sua música está sendo produzida...'}
                {order.status === 'COMPLETED' && 'Sua música está pronta!'}
              </p>
            </div>
            <div className="text-2xl font-bold text-primary">
              {statusInfo.progress}%
            </div>
          </div>
          <Progress value={statusInfo.progress} />
        </Card>

        {/* Payment Section */}
        {order.status === 'AWAITING_PAYMENT' && (
          <Card className="p-6 mb-6 border-orange-600/30 bg-orange-600/5">
            <h3 className="font-semibold text-lg mb-4">💳 Pagamento</h3>
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold">
                  R$ {((order.amount || 990) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-muted-foreground line-through">R$ 29,90</span>
                <Badge variant="secondary">67% OFF</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Escolha a forma de pagamento
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                onClick={handlePayment} 
                size="lg"
                variant="default"
                className="w-full"
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cartão de Crédito
                  </>
                )}
              </Button>
              <Button 
                onClick={handlePayment} 
                size="lg"
                variant="outline"
                className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 512 512" fill="currentColor">
                      <path d="M242.4 292.5c-3.9 4.3-9.4 6.7-15.1 6.7s-11.2-2.4-15.1-6.7l-64.5-70.5c-7.8-8.5-7.2-21.7 1.3-29.4 8.5-7.8 21.7-7.2 29.4 1.3l48.9 53.4 116.6-127.5c7.8-8.5 21-9 29.4-1.3 8.5 7.8 9 21 1.3 29.4l-132.2 144.6z"/>
                      <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 464c-114.7 0-208-93.3-208-208S141.3 48 256 48s208 93.3 208 208-93.3 208-208 208z"/>
                    </svg>
                    PIX
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Pagamento seguro via Stripe • Dados protegidos
            </p>
          </Card>
        )}

        {/* Actions */}
        {order.status !== 'AWAITING_PAYMENT' && (
          <Card className="p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">Ações</h3>
            <div className="space-y-3">
              <Button asChild className="w-full" variant="default">
                <Link to={`/acompanhar/${order.id}`}>
                  <Clock className="w-4 h-4 mr-2" />
                  Acompanhar em Tempo Real
                </Link>
              </Button>
              
              {(order.status === 'LYRICS_GENERATED' || order.status === 'LYRICS_APPROVED') && (
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/pedido/${order.id}/letras`}>
                    Ver Letras
                  </Link>
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Order Details */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Detalhes do Pedido</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{order.music_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estilo</p>
                <p className="font-medium">{order.music_style}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-medium">
                  R$ {((order.amount || 990) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            {order.story && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">História</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{order.story}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Order;
