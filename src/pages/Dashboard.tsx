import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, CheckCircle, Music, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar pedidos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'DRAFT': 'Rascunho',
      'AWAITING_PAYMENT': 'Aguardando Pagamento',
      'PAID': 'Pago',
      'LYRICS_DELIVERED': 'Letras Entregues',
      'WAITING_APPROVAL': 'Aguardando Aprovação',
      'APPROVED': 'Aprovado',
      'GENERATING_TRACK': 'Gerando Música',
      'TRACK_READY': 'Música Pronta',
      'DELIVERED': 'Entregue'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
        return 'bg-orange-100 text-orange-800';
      case 'PAID':
      case 'LYRICS_DELIVERED':
        return 'bg-blue-100 text-blue-800';
      case 'WAITING_APPROVAL':
        return 'bg-purple-100 text-purple-800';
      case 'APPROVED':
      case 'GENERATING_TRACK':
        return 'bg-green-100 text-green-800';
      case 'TRACK_READY':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p>Carregando seus pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Meus Pedidos</h1>
          </div>
          <p className="text-muted-foreground">
            Acompanhe suas músicas personalizadas
          </p>
        </div>

        {/* New Order Button */}
        <div className="mb-8 text-center">
          <Button asChild size="lg">
            <a href="/briefing">
              <Music className="w-4 h-4 mr-2" />
              Criar Nova Música
            </a>
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
                <a href="/briefing">Começar Agora</a>
              </Button>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      Música para {order.occasion}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {order.style} • {order.tone}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Criado em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary mb-1">
                      R$ {(order.price_cents / 100).toFixed(2).replace('.', ',')}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={`/pedido/${order.id}`}>
                        Ver Detalhes
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">História:</h4>
                  <p className="text-sm text-muted-foreground">
                    {order.story_raw.slice(0, 150)}
                    {order.story_raw.length > 150 ? '...' : ''}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;