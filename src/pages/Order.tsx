import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, CreditCard, Music, Download, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Order = () => {
  const { orderId } = useParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setShouldRedirect(true);
    } else if (user && orderId) {
      console.log('Loading order with ID:', orderId);
      
      // Set up real-time listener for the order
      const unsubscribe = onSnapshot(doc(db, "orders", orderId), (doc) => {
        if (doc.exists()) {
          setOrder({ id: doc.id, ...doc.data() });
        } else {
          setOrder(null);
        }
        setLoadingData(false);
      });

      return () => unsubscribe();
    }
  }, [user, orderId]);

  const handlePayment = async () => {
    try {
      toast({
        title: 'Processando pagamento...',
        description: 'Aguarde um momento',
      });

      // Simulate payment completion
      await updateDoc(doc(db, "orders", orderId!), {
        status: 'PAID',
        updatedAt: new Date()
      });

      toast({
        title: 'Pagamento confirmado!',
        description: 'Gerando letras automaticamente...',
      });

      // Call generate-lyrics function
      try {
        const response = await fetch("/api/generate-lyrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            orderId,
            storyRaw: order.storyRaw,
            style: order.style,
            tone: order.tone,
            durationTargetSec: order.durationTargetSec
          }),
        });

        const data = await response.json();
        
        if (data.ok) {
          toast({
            title: 'Letras geradas!',
            description: 'Suas letras estão prontas para aprovação.',
          });
        } else {
          throw new Error(data.error || 'Erro na geração de letras');
        }
      } catch (lyricsError: any) {
        console.error('Function call error:', lyricsError);
        toast({
          title: 'Letras em processamento',
          description: 'As letras serão geradas automaticamente em alguns minutos.',
        });
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Erro ao processar pagamento',
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

  // Redirect if not authenticated
  if (shouldRedirect) {
    return <Navigate to="/auth" replace />;
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
                {order.status === 'AWAITING_PAYMENT' ? 'Aguardando confirmação do pagamento' : 
                 order.status === 'DELIVERED' ? 'Sua música está pronta!' :
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
        {order.status === 'AWAITING_PAYMENT' && (
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

        {/* Link to Lyrics Page */}
        {order.status !== 'AWAITING_PAYMENT' && (
          <Card className="p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4">Letras da Música</h3>
            <p className="text-muted-foreground mb-4">
              Acesse a página de letras para ver e aprovar as versões geradas.
            </p>
            <Button asChild>
              <a href={`/pedido/${order.id}/letras`}>
                <Music className="w-4 h-4 mr-2" />
                Ver e Gerenciar Letras
              </a>
            </Button>
          </Card>
        )}

        {/* Order Details */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Detalhes do Pedido</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Ocasião</h4>
              <p className="text-muted-foreground">{order.occasion}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Estilo e Tom</h4>
              <p className="text-muted-foreground">{order.style} • {order.tone}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Duração Alvo</h4>
              <p className="text-muted-foreground">{Math.round(order.durationTargetSec / 60)} minutos</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">História</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{order.storyRaw}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Order;