import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, CreditCard, CheckCircle, Music, ArrowLeft, Sparkles, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useVIPAccess, bypassPaymentForVIP } from '@/hooks/useVIPAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user) return;

      try {
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

        // If already paid, redirect to create song
        if (data.payment_status === 'PAID') {
          navigate(`/criar-musica?orderId=${orderId}`);
          return;
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
      if (!vipLoading && isVIP && order && user && !processingVIP) {
        setProcessingVIP(true);
        toast.info('Acesso VIP detectado! Liberando geração de música...');
        
        const success = await bypassPaymentForVIP(order.id, user.id);
        
        if (success) {
          toast.success('Música liberada! Redirecionando...');
          setTimeout(() => {
            navigate(`/criar-musica?orderId=${order.id}`);
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
          // Voucher covers 100% - redirect to create song
          setTimeout(() => {
            navigate(`/criar-musica?orderId=${order.id}`);
          }, 1500);
        } else {
          // Update order with discount
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
        toast.error(data.error || 'Erro ao aplicar voucher');
      }
    } catch (error) {
      console.error('Error applying voucher:', error);
      toast.error('Erro ao aplicar voucher');
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handlePayment = async () => {
    if (!order) return;

    setProcessingPayment(true);

    try {
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

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  if (authLoading || vipLoading || loading || processingVIP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
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

  const currentPrice = order.amount || 990;
  const hasDiscount = order.discount_applied > 0;

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

        {/* Voucher Section */}
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
                  >
                    {validatingVoucher ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Tag className="h-4 w-4" />
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
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
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

        {/* Payment Section */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Total a Pagar
              </span>
              <div className="text-right">
                {hasDiscount && (
                  <p className="text-sm text-muted-foreground line-through">
                    {formatPrice(990)}
                  </p>
                )}
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(currentPrice)}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handlePayment}
              disabled={processingPayment}
              className="w-full h-12 text-lg"
              variant="hero"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pagar com Cartão ou PIX
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              Pagamento seguro via Stripe. Aceitamos cartões e PIX.
            </p>
          </CardContent>
        </Card>

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
