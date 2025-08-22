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
      fetchOrderData();
    }
  }, [user, orderId]);

  const fetchOrderData = async () => {
    try {
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
    toast({
      title: 'Pagamento simulado',
      description: 'Em breve integraremos com gateway de pagamento',
    });

    // Simulate payment completion
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'PAID',
          status: 'PAID'
        })
        .eq('id', orderId);

      if (error) throw error;

      // Generate lyrics
      await supabase.functions.invoke('generate-lyrics', {
        body: { order_id: orderId }
      });

      setOrder(prev => ({
        ...prev,
        payment_status: 'PAID',
        status: 'PAID'
      }));

      toast({
        title: 'Pagamento confirmado!',
        description: 'Iniciando geração das letras...',
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const approveLyric = async (lyricId: string) => {
    try {
      await supabase.functions.invoke('approve-lyric', {
        body: { 
          order_id: orderId,
          lyric_id: lyricId 
        }
      });

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
          <h1 className="text-3xl font-bold mb-2">Seu Pedido</h1>
          <p className="text-muted-foreground">#{order.id.slice(0, 8)}</p>
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