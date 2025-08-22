import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, CreditCard, Music, Download, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { reprocessPaidOrders } from "@/utils/reprocessOrders";

const Order = () => {
  const { orderId } = useParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [lyrics, setLyrics] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (user && orderId) {
      console.log('Loading order with ID:', orderId);
      fetchOrderData();
    }
  }, [user, orderId]);

  // Polling for status changes after payment
  useEffect(() => {
    if (order?.status === 'PAID' && lyrics.length === 0) {
      const interval = setInterval(() => {
        fetchOrderData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [order?.status, lyrics.length]);

  const fetchOrderData = async () => {
    try {
      console.log('Fetching order with ID:', orderId);
      
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch lyrics
      const { data: lyricsData } = await supabase
        .from('lyrics')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      setLyrics(lyricsData || []);

      // Fetch tracks
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      setTracks(tracksData || []);

    } catch (error: any) {
      toast({
        title: 'Erro ao carregar pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handlePayment = async () => {
    try {
      toast({
        title: 'Processando pagamento...',
        description: 'Aguarde um momento',
      });

      // Simulate payment completion
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'PAID',
          status: 'PAID'
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrder(prev => ({
        ...prev,
        payment_status: 'PAID',
        status: 'PAID'
      }));

      toast({
        title: 'Pagamento confirmado!',
        description: 'Gerando letras automaticamente...',
      });

      // Small delay to ensure order is updated
      setTimeout(async () => {
        try {
          console.log('Invoking generate-lyrics with orderId:', orderId);
          const { data, error: lyricsError } = await supabase.functions.invoke('generate-lyrics', {
            body: { orderId }
          });

          console.log('Generate-lyrics response:', data, 'Error:', lyricsError);

          if (lyricsError) {
            console.error('Lyric generation error:', lyricsError);
            toast({
              title: 'Erro na geração de letras',
              description: `Erro: ${lyricsError.message}. As letras serão geradas em breve automaticamente.`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Letras geradas!',
              description: 'Suas letras estão prontas para aprovação.',
            });
          }
        } catch (lyricsError: any) {
          console.error('Function call error:', lyricsError);
          toast({
            title: 'Letras em processamento',
            description: 'As letras serão geradas automaticamente em alguns minutos.',
          });
        }
      }, 1000);

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReprocessOrders = async () => {
    try {
      toast({
        title: 'Reprocessando pedidos...',
        description: 'Gerando letras para pedidos pagos',
      });

      const result = await reprocessPaidOrders();
      
      toast({
        title: 'Reprocessamento concluído!',
        description: `${result.totalProcessed} pedidos processados com sucesso`,
      });

      // Refresh data
      fetchOrderData();
    } catch (error: any) {
      toast({
        title: 'Erro no reprocessamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const approveLyric = async (lyricId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-lyric', {
        body: { 
          orderId,
          lyricId 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Letra aprovada!',
        description: 'Iniciando produção da música...',
      });

      // Refresh data
      fetchOrderData();
    } catch (error: any) {
      toast({
        title: 'Erro ao aprovar letra',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p>Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return <Navigate to="/" replace />;
  }

  const getStatusInfo = () => {
    switch (order.status) {
      case 'AWAITING_PAYMENT':
        return { 
          text: 'Aguardando Pagamento', 
          progress: 20, 
          icon: CreditCard,
          color: 'text-orange-500'
        };
      case 'PAID':
        return { 
          text: 'Pago - Preparando Letras', 
          progress: 40, 
          icon: Clock,
          color: 'text-blue-500'
        };
      case 'LYRICS_DELIVERED':
        return { 
          text: 'Letras Entregues', 
          progress: 50, 
          icon: Star,
          color: 'text-purple-500'
        };
      case 'WAITING_APPROVAL':
        return { 
          text: 'Aguardando Aprovação', 
          progress: 60, 
          icon: Star,
          color: 'text-orange-500'
        };
      case 'APPROVED':
        return { 
          text: 'Aprovado - Criando Música', 
          progress: 70, 
          icon: Music,
          color: 'text-green-500'
        };
      case 'GENERATING_TRACK':
        return { 
          text: 'Gerando Faixa Musical', 
          progress: 85, 
          icon: Music,
          color: 'text-green-500'
        };
      case 'TRACK_READY':
        return { 
          text: 'Música Pronta', 
          progress: 95, 
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 'DELIVERED':
        return { 
          text: 'Concluído', 
          progress: 100, 
          icon: CheckCircle,
          color: 'text-green-600'
        };
      default:
        return { 
          text: 'Em andamento', 
          progress: 0, 
          icon: Clock,
          color: 'text-gray-500'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" asChild>
              <a href="/dashboard">← Meus Pedidos</a>
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold mb-2">Seu Pedido</h1>
              <p className="text-muted-foreground">#{order.id.slice(0, 8)}</p>
            </div>
            <div className="w-[120px]"></div>
          </div>
        </div>

        {/* Status */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
            <div>
              <h3 className="font-semibold text-lg">{statusInfo.text}</h3>
              <p className="text-sm text-muted-foreground">
                {order.payment_status === 'PENDING' ? 'Aguardando confirmação do pagamento' : 
                 order.status === 'COMPLETED' ? 'Sua música está pronta!' :
                 'Trabalhando na sua música personalizada'}
              </p>
            </div>
          </div>
          <Progress value={statusInfo.progress} className="mb-2" />
          <div className="text-right text-sm text-muted-foreground">
            {statusInfo.progress}% concluído
          </div>
        </Card>

        {/* Payment Section */}
        {order.payment_status === 'PENDING' && (
          <Card className="p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4">Pagamento</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold">R$ 9,99</span>
                  <span className="text-sm text-muted-foreground line-through">R$ 30,00</span>
                  <Badge variant="secondary">67% OFF</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ocasião: {order.occasion} • Estilo: {order.style}
                </p>
              </div>
              <Button onClick={handlePayment} size="lg">
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar Agora
              </Button>
            </div>
          </Card>
        )}

        {/* Admin Tools - Temporary */}
        {order.payment_status === 'PAID' && lyrics.length === 0 && (
          <Card className="p-6 mb-8 border-orange-200 bg-orange-50">
            <h3 className="font-semibold text-lg mb-4 text-orange-800">Ferramentas de Desenvolvimento</h3>
            <p className="text-sm text-orange-600 mb-4">
              Se as letras não foram geradas automaticamente, use o botão abaixo:
            </p>
            <Button onClick={handleReprocessOrders} variant="outline" className="border-orange-300">
              <Music className="w-4 h-4 mr-2" />
              Gerar Letras Manualmente
            </Button>
          </Card>
        )}

        {/* Lyrics Section */}
        {lyrics.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4">Versões das Letras</h3>
            <div className="space-y-4">
              {lyrics.map((lyric, index) => (
                <div key={lyric.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{lyric.title}</h4>
                    <Badge variant={lyric.approved_at ? "default" : "outline"}>
                      Versão {index + 1}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                    {lyric.text.slice(0, 200)}...
                  </div>
                  {!order.approved_lyric_id && order.payment_status === 'PAID' && (
                    <Button 
                      onClick={() => approveLyric(lyric.id)}
                      size="sm"
                      variant="outline"
                    >
                      Aprovar Esta Versão
                    </Button>
                  )}
                  {lyric.approved_at && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Versão aprovada
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Music Section */}
        {tracks.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Sua Música</h3>
            <div className="space-y-4">
              {tracks.map((track) => (
                <div key={track.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium mb-1">Música Finalizada</h4>
                      <Badge variant={track.status === 'COMPLETED' ? "default" : "outline"}>
                        {track.status}
                      </Badge>
                    </div>
                    {track.audio_url && (
                      <Button asChild>
                        <a href={track.audio_url} download>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Order;