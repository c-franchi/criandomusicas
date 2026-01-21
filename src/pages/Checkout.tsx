import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, CreditCard, CheckCircle, Music, ArrowLeft, Sparkles, Gift, QrCode, Copy, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useVIPAccess, bypassPaymentForVIP } from '@/hooks/useVIPAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PixConfigData {
  pix_key: string;
  pix_name: string;
  qr_code_url: string;
  is_active: boolean;
}

interface OrderData {
  id: string;
  user_id: string;
  music_type: string | null;
  music_style: string | null;
  emotion: string | null;
  story: string | null;
  payment_status: string;
  amount: number;
  voucher_code: string | null;
  discount_applied: number;
  payment_method: string | null;
  is_instrumental: boolean | null;
}

interface VoucherValidation {
  valid: boolean;
  error?: string;
  voucher?: {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  };
  original_price: number;
  discount_amount: number;
  final_price: number;
  is_free: boolean;
}

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isVIP, loading: vipLoading } = useVIPAccess(user?.id, user?.email || undefined);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voucherCode, setVoucherCode] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherResult, setVoucherResult] = useState<VoucherValidation | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingVIP, setProcessingVIP] = useState(false);
  const [showPixSection, setShowPixSection] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [pixConfig, setPixConfig] = useState<PixConfigData | null>(null);

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

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user) return;

      try {
        // Fetch pricing first
        const { data: pricingData } = await supabase
          .from('pricing_config')
          .select('price_cents, price_promo_cents')
          .eq('id', 'single')
          .single();
        
        const basePrice = pricingData?.price_promo_cents || pricingData?.price_cents || 1990;

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;

        if (data.user_id !== user.id) {
          toast.error('Este pedido não pertence a você');
          navigate('/');
          return;
        }

        // If already paid, redirect based on order type
        if (data.payment_status === 'PAID') {
          if (data.is_instrumental) {
            // Instrumental: go to dashboard to wait for production
            navigate('/dashboard');
          } else {
            // Vocal: go to lyrics selection/creation
            navigate(`/criar-musica?orderId=${orderId}`);
          }
          return;
        }

        // If awaiting PIX, show waiting state
        if (data.payment_status === 'AWAITING_PIX') {
          setShowPixSection(true);
          setPixConfirmed(true);
        }

        // If amount is 0, set base price
        if (data.amount === 0) {
          await supabase.from('orders').update({ amount: basePrice }).eq('id', orderId);
          data.amount = basePrice;
        }

        setOrder(data);
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Erro ao carregar pedido');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchOrder();
    }
  }, [orderId, user, authLoading, navigate]);

  // Auto-process VIP access
  useEffect(() => {
    const processVIPAccess = async () => {
      if (!vipLoading && isVIP && order && user && !processingVIP && order.payment_status !== 'AWAITING_PIX') {
        setProcessingVIP(true);
        toast.info('Acesso VIP detectado! Liberando geração de música...');
        
        const success = await bypassPaymentForVIP(order.id, user.id);
        
        if (success) {
          toast.success('Música liberada! Redirecionando...');
          setTimeout(() => {
            // VIP: redirect based on order type
            if (order.is_instrumental) {
              navigate('/dashboard');
            } else {
              navigate(`/criar-musica?orderId=${order.id}`);
            }
          }, 1500);
        } else {
          setProcessingVIP(false);
          toast.error('Erro ao processar acesso VIP');
        }
      }
    };

    processVIPAccess();
  }, [isVIP, vipLoading, order, user, navigate, processingVIP]);

  const validateVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Digite um código de voucher');
      return;
    }

    setValidatingVoucher(true);
    setVoucherResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-voucher', {
        body: { code: voucherCode, planId: 'single' },
      });

      if (error) throw error;

      setVoucherResult(data);

      if (data.valid) {
        toast.success('Voucher válido!');
      } else {
        toast.error(data.error || 'Voucher inválido');
      }
    } catch (error) {
      console.error('Error validating voucher:', error);
      toast.error('Erro ao validar voucher');
    } finally {
      setValidatingVoucher(false);
    }
  };

  const applyVoucher = async () => {
    if (!voucherResult?.valid || !order) return;

    setApplyingVoucher(true);

    try {
      const { data, error } = await supabase.functions.invoke('apply-voucher', {
        body: { code: voucherCode, orderId: order.id, planId: 'single' },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);

        if (data.is_free) {
          // For 100% discount, trigger generation automatically based on order type
          const isInstrumental = order.is_instrumental === true;
          
          toast.info(isInstrumental 
            ? 'Preparando sua música instrumental...' 
            : 'Gerando letras da sua música...');
          
          // Fetch full order data for briefing
          const { data: orderData } = await supabase
            .from('orders')
            .select('*')
            .eq('id', order.id)
            .single();

          if (orderData) {
            // Build briefing from order data
            const briefing = {
              musicType: orderData.music_type || 'homenagem',
              emotion: orderData.emotion || 'alegria',
              emotionIntensity: orderData.emotion_intensity || 3,
              style: orderData.music_style || 'pop',
              rhythm: orderData.rhythm || 'moderado',
              atmosphere: orderData.atmosphere || 'festivo',
              structure: orderData.music_structure?.split(',') || ['verse', 'chorus'],
              hasMonologue: orderData.has_monologue || false,
              monologuePosition: orderData.monologue_position || 'bridge',
              mandatoryWords: orderData.mandatory_words || '',
              restrictedWords: orderData.restricted_words || '',
              voiceType: orderData.voice_type || 'feminina',
              instruments: orderData.instruments || [],
              soloInstrument: orderData.solo_instrument || null,
              soloMoment: orderData.solo_moment || null,
              instrumentationNotes: orderData.instrumentation_notes || ''
            };

            // Trigger automatic generation based on type
            try {
              if (isInstrumental) {
                // For instrumental, skip lyrics and generate style prompt directly
                await supabase.functions.invoke('generate-style-prompt', {
                  body: {
                    orderId: order.id,
                    isInstrumental: true,
                    briefing
                  }
                });
              } else {
                // For vocal music, generate lyrics first
                await supabase.functions.invoke('generate-lyrics', {
                  body: {
                    orderId: order.id,
                    story: orderData.story,
                    briefing
                  }
                });
              }
            } catch (genError) {
              console.error('Generation error:', genError);
            }
          }

          setTimeout(() => {
            if (isInstrumental) {
              toast.success('Sua música instrumental está em produção!');
              navigate('/dashboard');
            } else {
              navigate(`/criar-musica?orderId=${order.id}`);
            }
          }, 1500);
        } else {
          setOrder(prev => prev ? {
            ...prev,
            amount: data.final_price,
            voucher_code: voucherCode,
            discount_applied: data.discount_amount,
          } : null);
          setVoucherResult(null);
          setVoucherCode('');
        }
      } else {
        // Show the specific error from the server
        const errorMsg = data.error || 'Erro ao aplicar voucher';
        toast.error(errorMsg);
        setVoucherResult(null);
        setVoucherCode('');
      }
    } catch (error: any) {
      // Extract error message from response if available
      const errorDetail = error?.message || error?.error || 'Erro ao aplicar voucher';
      toast.error(errorDetail);
      console.error('Error applying voucher:', error);
      toast.error('Erro ao aplicar voucher');
    } finally {
      setApplyingVoucher(false);
    }
  };

  // Handle card payment via Stripe
  const handleCardPayment = async () => {
    if (!order) return;

    setProcessingPayment(true);

    try {
      // Update payment method to card
      await supabase.from('orders').update({ payment_method: 'card' }).eq('id', order.id);

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { orderId: order.id, planId: 'single' },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de pagamento não recebida');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Erro ao processar pagamento');
      setProcessingPayment(false);
    }
  };

  // Handle PIX payment selection
  const handlePixPayment = async () => {
    if (!order) return;

    setShowPixSection(true);

    try {
      // Update order to AWAITING_PIX status
      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: 'pix',
          payment_status: 'AWAITING_PIX'
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({
        ...order,
        payment_method: 'pix',
        payment_status: 'AWAITING_PIX'
      });
    } catch (error) {
      console.error('PIX update error:', error);
    }
  };

  // Copy PIX key to clipboard
  const copyPixKey = () => {
    if (!pixConfig) return;
    navigator.clipboard.writeText(pixConfig.pix_key);
    setCopiedKey(true);
    toast.success('Chave PIX copiada!');
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // Confirm PIX payment was made
  const confirmPixPayment = () => {
    setPixConfirmed(true);
    toast.success('Aguardando confirmação do pagamento PIX (até 30 minutos)');
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  if (authLoading || vipLoading || loading || processingVIP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Music className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {processingVIP ? 'Processando acesso VIP...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Pedido não encontrado</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPrice = order.amount || 1990;
  const hasDiscount = order.discount_applied > 0;
  const originalPrice = hasDiscount ? (currentPrice + order.discount_applied) : 1990;

  // PIX Waiting State
  if (showPixSection && pixConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <Card className="text-center p-6">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aguardando Confirmação PIX</h2>
            <p className="text-muted-foreground mb-6">
              Após o pagamento, vamos confirmar em até 30 minutos e você receberá uma notificação.
            </p>

            {/* QR Code First */}
            <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-6">
              <img 
                src={pixConfig?.qr_code_url || '/images/pix-qrcode.jpg'} 
                alt="QR Code PIX" 
                className="w-48 h-48 object-contain"
              />
            </div>

            {/* Price and PIX Key */}
            <Card className="p-4 bg-muted/50 mb-6 text-left">
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground">Valor a pagar:</Label>
                <div className="flex items-center gap-2">
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                  )}
                  <span className="text-2xl font-bold text-primary">{formatPrice(currentPrice)}</span>
                  {hasDiscount && (
                    <Badge variant="secondary" className="bg-success/20 text-success text-xs">
                      -{formatPrice(order.discount_applied)}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Chave PIX (CNPJ):</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-background rounded text-sm font-mono">{pixConfig?.pix_key || '14.389.841/0001-47'}</code>
                    <Button variant="outline" size="sm" onClick={copyPixKey}>
                      {copiedKey ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nome:</Label>
                  <p className="font-medium">{pixConfig?.pix_name || 'Criando Músicas'}</p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
              <p className="text-xs text-muted-foreground">
                Acompanhe o status do seu pedido no Dashboard
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Finalizar Pedido</h1>
            <p className="text-muted-foreground">Complete o pagamento para gerar sua música</p>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Resumo do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">{order.music_type || 'Música Personalizada'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estilo</p>
                <p className="font-medium">{order.music_style || 'A definir'}</p>
              </div>
              {order.emotion && (
                <div>
                  <p className="text-muted-foreground">Emoção</p>
                  <p className="font-medium">{order.emotion}</p>
                </div>
              )}
            </div>

            {order.story && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-muted-foreground text-sm mb-2">História</p>
                <p className="text-sm line-clamp-3">{order.story}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voucher Section - Only show if not in PIX mode */}
        {!showPixSection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="h-5 w-5 text-accent" />
                Tem um voucher?
              </CardTitle>
              <CardDescription>
                Insira seu código de desconto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasDiscount ? (
                <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/30">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-success">Voucher aplicado!</p>
                    <p className="text-sm text-muted-foreground">
                      Código: {order.voucher_code} • Desconto: {formatPrice(order.discount_applied)}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código do voucher"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="uppercase"
                      disabled={validatingVoucher || applyingVoucher}
                    />
                    <Button
                      variant="outline"
                      onClick={validateVoucher}
                      disabled={validatingVoucher || !voucherCode.trim()}
                      className="shrink-0"
                    >
                      {validatingVoucher ? (
                        <Music className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Tag className="h-4 w-4 mr-2" />
                          <span>Usar voucher</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {voucherResult && (
                    <div className={`p-4 rounded-lg border ${
                      voucherResult.valid 
                        ? 'bg-success/10 border-success/30' 
                        : 'bg-destructive/10 border-destructive/30'
                    }`}>
                      {voucherResult.valid ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-success" />
                            <span className="font-medium text-success">Voucher válido!</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-muted-foreground">Desconto:</span>{' '}
                              {voucherResult.voucher?.discount_type === 'percent' 
                                ? `${voucherResult.voucher?.discount_value}%`
                                : formatPrice(voucherResult.discount_amount)}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Preço final:</span>{' '}
                              <span className="font-bold text-lg">
                                {voucherResult.is_free ? 'GRÁTIS!' : formatPrice(voucherResult.final_price)}
                              </span>
                            </p>
                          </div>
                          <Button 
                            onClick={applyVoucher} 
                            disabled={applyingVoucher}
                            className="w-full"
                          >
                            {applyingVoucher ? (
                              <Music className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            {voucherResult.is_free ? 'Gerar Música Grátis' : 'Aplicar Desconto'}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-destructive">{voucherResult.error}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Section */}
        {!showPixSection && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Forma de Pagamento
                </span>
                <div className="text-right">
                  {hasDiscount && (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatPrice(1990)}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(currentPrice)}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Card Payment */}
              <Button
                onClick={handleCardPayment}
                disabled={processingPayment}
                className="w-full h-14 justify-start gap-4"
                variant="hero"
              >
                {processingPayment ? (
                  <Music className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium">Cartão de Crédito</p>
                  <p className="text-xs opacity-80">Pagamento seguro via Stripe</p>
                </div>
              </Button>

              {/* PIX Payment */}
              <Button
                onClick={handlePixPayment}
                variant="outline"
                className="w-full h-14 justify-start gap-4 border-2 border-emerald-600/50 hover:border-emerald-600 hover:bg-emerald-600/10"
              >
                <QrCode className="h-5 w-5 text-emerald-600" />
                <div className="flex-1 text-left">
                  <p className="font-medium">PIX</p>
                  <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                </div>
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Pagamento seguro • Dados protegidos
              </p>
            </CardContent>
          </Card>
        )}

        {/* PIX Payment Details */}
        {showPixSection && !pixConfirmed && (
          <Card className="border-emerald-600/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600" />
                Pagamento via PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code - Clean Display */}
              <div className="text-center">
                <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-3">
                  <img 
                    src={pixConfig?.qr_code_url || '/images/pix-qrcode.jpg'} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code ou copie a chave PIX abaixo
                </p>
              </div>

              {/* Price with Discount Display */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor a pagar:</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasDiscount && (
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                      )}
                      <span className="text-2xl font-bold text-primary">{formatPrice(currentPrice)}</span>
                      {hasDiscount && (
                        <Badge variant="secondary" className="bg-success/20 text-success text-xs">
                          -{formatPrice(order.discount_applied)}
                        </Badge>
                      )}
                    </div>
                    {hasDiscount && order.voucher_code && (
                      <p className="text-xs text-success mt-1">
                        Voucher {order.voucher_code} aplicado!
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Chave PIX (CNPJ):</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 p-2 bg-background rounded text-sm font-mono">{pixConfig?.pix_key || '14.389.841/0001-47'}</code>
                      <Button variant="outline" size="sm" onClick={copyPixKey}>
                        {copiedKey ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome:</Label>
                    <p className="font-medium">{pixConfig?.pix_name || 'Criando Músicas'}</p>
                  </div>
                </div>
              </Card>

              <Button className="w-full" onClick={confirmPixPayment}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Já Fiz o Pagamento PIX
              </Button>

              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => setShowPixSection(false)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar às opções de pagamento
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security badges */}
        <div className="flex justify-center gap-4">
          <Badge variant="secondary" className="text-xs">
            🔒 Pagamento Seguro
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ⚡ Música em Minutos
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ✨ IA Premium
          </Badge>
        </div>
      </div>
    </div>
  );
}
