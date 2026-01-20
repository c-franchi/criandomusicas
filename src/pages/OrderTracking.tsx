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
  FileText,
  PlayCircle,
  Headphones,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  lyric_title?: string;
}

const ORDER_STEPS = [
  { status: 'DRAFT', label: 'Briefing', icon: FileText, progress: 10 },
  { status: 'AWAITING_PAYMENT', label: 'Pagamento', icon: CreditCard, progress: 20 },
  { status: 'PAID', label: 'Pago', icon: CheckCircle, progress: 30 },
  { status: 'LYRICS_PENDING', label: 'Gerando Letras', icon: Clock, progress: 40 },
  { status: 'LYRICS_GENERATED', label: 'Letras Prontas', icon: FileText, progress: 50 },
  { status: 'LYRICS_APPROVED', label: 'Letras Aprovadas', icon: CheckCircle, progress: 60 },
  { status: 'MUSIC_GENERATING', label: 'Produzindo Música', icon: PlayCircle, progress: 80 },
  { status: 'MUSIC_READY', label: 'Música Pronta', icon: Headphones, progress: 95 },
  { status: 'COMPLETED', label: 'Entregue', icon: CheckCircle, progress: 100 },
];

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch initial order data
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

    console.log('Setting up realtime subscription for order:', orderId);

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          console.log('Order updated in realtime:', payload);
          const newData = payload.new as OrderData;
          
          // Fetch lyric title if approved
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
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, orderId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
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

  const getCurrentStep = () => {
    return ORDER_STEPS.find(step => step.status === order.status) || ORDER_STEPS[0];
  };

  const currentStep = getCurrentStep();
  const CurrentIcon = currentStep.icon;

  const getStatusColor = (status: string) => {
    if (status === order.status) return 'bg-primary text-primary-foreground';
    const currentIndex = ORDER_STEPS.findIndex(s => s.status === order.status);
    const stepIndex = ORDER_STEPS.findIndex(s => s.status === status);
    if (stepIndex < currentIndex) return 'bg-green-500 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const isStepCompleted = (status: string) => {
    const currentIndex = ORDER_STEPS.findIndex(s => s.status === order.status);
    const stepIndex = ORDER_STEPS.findIndex(s => s.status === status);
    return stepIndex < currentIndex;
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {order.lyric_title || `Música ${order.music_type}`}
              </h1>
              <p className="text-muted-foreground">
                {order.music_style} • Pedido #{order.id.slice(0, 8)}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Current Status Card */}
        <Card className="p-6 mb-6 border-primary/50 bg-primary/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <CurrentIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">{currentStep.label}</h2>
              <p className="text-muted-foreground text-sm">
                {order.status === 'MUSIC_GENERATING' && 'Sua música está sendo produzida. Isso pode levar alguns minutos...'}
                {order.status === 'LYRICS_APPROVED' && 'Letras aprovadas! Aguardando produção da música.'}
                {order.status === 'LYRICS_GENERATED' && 'Suas letras estão prontas para aprovação.'}
                {order.status === 'COMPLETED' && 'Sua música está pronta! 🎉'}
                {order.status === 'MUSIC_READY' && 'Música finalizada e pronta para download!'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{currentStep.progress}%</div>
            </div>
          </div>
          <Progress value={currentStep.progress} className="mt-4" />
        </Card>

        {/* Timeline */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-6">Progresso do Pedido</h3>
          <div className="space-y-4">
            {ORDER_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = isStepCompleted(step.status);
              const isCurrent = step.status === order.status;
              
              return (
                <div key={step.status} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                  </div>
                  {isCurrent && (
                    <Badge variant="default" className="animate-pulse">
                      Em andamento
                    </Badge>
                  )}
                  {isCompleted && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                      Concluído
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actions based on status */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Ações</h3>
          <div className="space-y-3">
            {order.status === 'LYRICS_GENERATED' && (
              <Button asChild className="w-full" size="lg">
                <Link to={`/pedido/${order.id}/letras`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver e Aprovar Letras
                </Link>
              </Button>
            )}
            
            {(order.status === 'MUSIC_READY' || order.status === 'COMPLETED') && (
              <Button className="w-full" size="lg">
                <Headphones className="w-4 h-4 mr-2" />
                Ouvir Minha Música
              </Button>
            )}
            
            <Button asChild variant="outline" className="w-full">
              <Link to={`/pedido/${order.id}`}>
                Ver Detalhes do Pedido
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrderTracking;
