import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Video, Image, Play, CreditCard, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type VideoType = 'photos_5' | 'photos_8' | 'video_2min';

const videoOptions = [
  {
    id: 'photos_5' as VideoType,
    title: '5 Fotos + Áudio',
    description: 'Slideshow com até 5 fotos',
    icon: Image,
  },
  {
    id: 'photos_8' as VideoType,
    title: '8 Fotos + 1 Vídeo',
    description: '8 fotos + vídeo de até 1 min',
    icon: Image,
  },
  {
    id: 'video_2min' as VideoType,
    title: 'Vídeo de 2 min',
    description: 'Envie vídeo de até 2 minutos',
    icon: Play,
  },
];

const VideoCheckout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<VideoType>('photos_5');
  const [loading, setLoading] = useState(false);
  const [orderTitle, setOrderTitle] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    // Fetch order info for display
    if (orderId && user) {
      const fetchOrder = async () => {
        const { data: order } = await supabase
          .from('orders')
          .select('approved_lyric_id')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (order?.approved_lyric_id) {
          const { data: lyric } = await supabase
            .from('lyrics')
            .select('title')
            .eq('id', order.approved_lyric_id)
            .single();
          
          if (lyric?.title) {
            setOrderTitle(lyric.title);
          }
        }
      };
      fetchOrder();
    }
  }, [orderId, user, authLoading, navigate]);

  const handlePayment = async () => {
    if (!user || !orderId) return;

    setLoading(true);
    try {
      // Create video order
      const { data: videoOrder, error: createError } = await supabase
        .from('video_orders')
        .insert({
          user_id: user.id,
          order_id: orderId,
          video_type: selectedType,
          amount: 5000, // R$ 50
          status: 'AWAITING_PAYMENT',
          payment_status: 'PENDING'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create Stripe checkout session
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: {
          videoOrderId: videoOrder.id,
          amount: 5000,
          description: `Vídeo Personalizado - ${orderTitle || 'Música'}`,
          successUrl: `${window.location.origin}/video-upload/${videoOrder.id}`,
          cancelUrl: `${window.location.origin}/video-checkout/${orderId}`,
          isVideoOrder: true
        }
      });

      if (paymentError) throw paymentError;

      if (paymentData?.url) {
        window.location.href = paymentData.url;
      } else {
        throw new Error('URL de pagamento não recebida');
      }

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao processar pagamento',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center">
            <Badge className="mb-4 bg-primary/20 text-primary">
              <Video className="w-3 h-3 mr-1" />
              Criar Vídeo
            </Badge>
            <h1 className="text-3xl font-bold mb-2">Vídeo Personalizado</h1>
            {orderTitle && (
              <p className="text-muted-foreground">
                Para a música: <strong>{orderTitle}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Video Type Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Escolha o tipo de vídeo</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={selectedType} 
              onValueChange={(v) => setSelectedType(v as VideoType)}
              className="space-y-4"
            >
              {videoOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedType === option.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setSelectedType(option.id)}
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <option.icon className="w-6 h-6 text-primary" />
                  </div>
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    <span className="font-semibold">{option.title}</span>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </Label>
                  <CheckCircle className={`w-5 h-5 ${selectedType === option.id ? 'text-primary' : 'text-transparent'}`} />
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Price Summary */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg">Valor do serviço</span>
              <span className="text-2xl font-bold text-primary">R$ 50,00</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Edição profissional
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Sincronização com sua música
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Entrega em até 48 horas
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment} 
          disabled={loading}
          className="w-full h-14 text-lg"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pagar R$ 50,00
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoCheckout;
