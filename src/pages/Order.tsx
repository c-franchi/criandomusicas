import { useState, useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  Clock, 
  CreditCard, 
  Music, 
  ArrowLeft,
  Loader2,
  QrCode,
  Copy
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// PIX Configuration
const PIX_KEY = '14.389.841/0001-47';
const PIX_NAME = 'Criando Músicas';

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
  payment_method?: string | null;
}

const Order = () => {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

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

  const copyPixKey = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopiedKey(true);
    toast({ title: 'Chave PIX copiada!' });
    setTimeout(() => setCopiedKey(false), 3000);
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
    // Check payment status first for PIX
    if (order.payment_status === 'AWAITING_PIX') {
      return { text: 'Aguardando Confirmação PIX', progress: 15, icon: Clock, color: 'text-yellow-500' };
    }

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
                {order.payment_status === 'AWAITING_PIX' && 'Aguardando confirmação do pagamento PIX'}
                {order.status === 'AWAITING_PAYMENT' && order.payment_status !== 'AWAITING_PIX' && 'Complete o pagamento para iniciar a produção'}
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

        {/* PIX Waiting Section */}
        {order.payment_status === 'AWAITING_PIX' && (
          <Card className="p-6 mb-6 border-yellow-600/30 bg-yellow-600/5">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold text-lg">Aguardando Confirmação PIX</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Após realizar o pagamento, nossa equipe irá confirmar em até 30 minutos. 
              Você receberá uma notificação quando o pagamento for confirmado.
            </p>
            
            <Card className="p-4 bg-muted/50 mb-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor a pagar:</Label>
                  <p className="text-2xl font-bold text-primary">
                    R$ {((order.amount || 1990) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Chave PIX (CNPJ):</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-background rounded text-sm font-mono">{PIX_KEY}</code>
                    <Button variant="outline" size="sm" onClick={copyPixKey}>
                      {copiedKey ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nome:</Label>
                  <p className="font-medium">{PIX_NAME}</p>
                </div>
              </div>
            </Card>

            <div className="text-center">
              <img 
                src="/images/pix-qrcode.jpg" 
                alt="QR Code PIX" 
                className="w-40 h-40 mx-auto rounded-lg border shadow-lg object-contain"
              />
            </div>
          </Card>
        )}

        {/* Payment Section */}
        {order.status === 'AWAITING_PAYMENT' && order.payment_status !== 'AWAITING_PIX' && (
          <Card className="p-6 mb-6 border-orange-600/30 bg-orange-600/5">
            <h3 className="font-semibold text-lg mb-4">💳 Pagamento</h3>
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold">
                  R$ {((order.amount || 1990) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-muted-foreground line-through">R$ 47,90</span>
                <Badge variant="secondary">PROMOÇÃO</Badge>
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
                asChild
                size="lg"
                variant="outline"
                className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                <Link to={`/checkout/${order.id}`}>
                  <QrCode className="w-4 h-4 mr-2" />
                  PIX
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Pagamento seguro • Dados protegidos
            </p>
          </Card>
        )}

        {/* Actions */}
        {order.status !== 'AWAITING_PAYMENT' && order.payment_status !== 'AWAITING_PIX' && (
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
                  R$ {((order.amount || 1990) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
