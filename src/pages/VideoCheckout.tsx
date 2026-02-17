import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Video, Image, Play, CreditCard, CheckCircle, ArrowLeft, Loader2, QrCode, Copy, Clock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface PixConfigData {
  pix_key: string;
  pix_name: string;
  qr_code_url: string;
  is_active: boolean;
}

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
  const { t } = useTranslation('common');
  const [selectedType, setSelectedType] = useState<VideoType>('photos_5');
  const [loading, setLoading] = useState(false);
  const [orderTitle, setOrderTitle] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | null>(null);
  const [showPixSection, setShowPixSection] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [pixConfig, setPixConfig] = useState<PixConfigData | null>(null);
  const [videoOrderId, setVideoOrderId] = useState<string | null>(null);

  // Fetch PIX config
  useEffect(() => {
    const fetchPixConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('pix_config')
          .select('*')
          .eq('id', 'main')
          .single();

        if (!error && data) {
          setPixConfig(data);
        }
      } catch (error) {
        console.error('Error fetching PIX config:', error);
      }
    };

    fetchPixConfig();
  }, []);

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

  // Create video order (shared between payment methods)
  const createVideoOrder = async () => {
    if (!user || !orderId) return null;

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
    return videoOrder;
  };

  // Handle card payment via Stripe
  const handleCardPayment = async () => {
    if (!user || !orderId) return;

    setLoading(true);
    try {
      const videoOrder = await createVideoOrder();
      if (!videoOrder) throw new Error('Erro ao criar pedido');

      setVideoOrderId(videoOrder.id);

      // Update payment method
      await supabase.from('video_orders').update({ payment_status: 'PENDING' }).eq('id', videoOrder.id);

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

  // Handle PIX payment selection
  const handlePixPayment = async () => {
    if (!user || !orderId) return;

    setLoading(true);
    try {
      const videoOrder = await createVideoOrder();
      if (!videoOrder) throw new Error('Erro ao criar pedido');

      setVideoOrderId(videoOrder.id);

      // Update to AWAITING_PIX status
      const { error } = await supabase
        .from('video_orders')
        .update({
          payment_status: 'AWAITING_PIX'
        })
        .eq('id', videoOrder.id);

      if (error) throw error;

      setShowPixSection(true);
    } catch (error) {
      console.error('PIX error:', error);
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

  // Copy PIX key to clipboard
  const copyPixKey = () => {
    if (!pixConfig) return;
    navigator.clipboard.writeText(pixConfig.pix_key);
    setCopiedKey(true);
    toast({
      title: 'Chave PIX copiada!',
      description: 'Cole no seu aplicativo de banco',
    });
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // Confirm PIX payment was made
  const confirmPixPayment = () => {
    setPixConfirmed(true);
    toast({
      title: 'Aguardando confirmação',
      description: 'Seu pagamento será confirmado em até 30 minutos pelo administrador.',
    });
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
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
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
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

        {/* PIX Section - Show when PIX is selected */}
        {showPixSection ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Pagamento via PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!pixConfirmed ? (
                <>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary mb-4">
                      {formatPrice(5000)}
                    </p>
                    
                    {pixConfig?.qr_code_url && (
                      <div className="mb-6">
                        <img 
                          src={pixConfig.qr_code_url} 
                          alt="QR Code PIX" 
                          className="w-48 h-48 mx-auto rounded-lg border"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Chave PIX (CNPJ):</p>
                        <div className="flex items-center justify-center gap-2">
                          <code className="font-mono text-sm">{pixConfig?.pix_key || '14.389.841/0001-47'}</code>
                          <Button variant="ghost" size="sm" onClick={copyPixKey}>
                            <Copy className={`w-4 h-4 ${copiedKey ? 'text-primary' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Nome do beneficiário:</p>
                        <p className="font-medium">{pixConfig?.pix_name || 'Criando Músicas'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={confirmPixPayment} 
                    className="w-full h-12"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Já fiz o pagamento PIX
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Aguardando confirmação</h3>
                  <p className="text-muted-foreground mb-6">
                    Seu pagamento PIX será confirmado pelo administrador em até 30 minutos.
                    Você receberá uma notificação quando for aprovado.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    {t('video.goToOrders', 'Ir para Meus Pedidos')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
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
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Edição profissional
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Sincronização com sua música
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Entrega em até 48 horas
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Escolha a forma de pagamento</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={handleCardPayment} 
                  disabled={loading}
                  className="h-16 flex flex-col items-center justify-center"
                  variant="outline"
                  size="lg"
                >
                  {loading && paymentMethod === 'card' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mb-1" />
                      <span className="text-sm">Cartão de Crédito</span>
                    </>
                  )}
                </Button>

                <Button 
                  onClick={handlePixPayment} 
                  disabled={loading}
                  className="h-16 flex flex-col items-center justify-center"
                  variant="outline"
                  size="lg"
                >
                  {loading && paymentMethod === 'pix' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <QrCode className="w-5 h-5 mb-1" />
                      <span className="text-sm">PIX</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCheckout;
