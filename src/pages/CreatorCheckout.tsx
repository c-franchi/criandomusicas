import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, Loader2, Tag, Music, ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

interface PricingPlan {
  id: string;
  name: string;
  price_cents: number;
  price_promo_cents: number | null;
  price_display: string;
  features: string[];
  is_popular: boolean;
  credits: number | null;
}

interface VoucherValidation {
  valid: boolean;
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
  error?: string;
}

// Helper to format cents to BRL
const formatPrice = (cents: number): string => {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
};

const CreatorCheckout = () => {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [plan, setPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  
  // Voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null);

  // Fetch plan details
  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) {
        navigate('/planos');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pricing_config')
          .select('*')
          .eq('id', planId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Plano não encontrado",
            description: "O plano selecionado não existe ou está inativo.",
            variant: "destructive",
          });
          navigate('/planos');
          return;
        }

        setPlan({
          ...data,
          features: Array.isArray(data.features) ? data.features as string[] : [],
          credits: data.credits || 1
        });
      } catch (error) {
        console.error('Error fetching plan:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o plano.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, navigate, toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/creator-checkout/${planId}`);
    }
  }, [authLoading, user, planId, navigate]);

  // Validate voucher
  const handleValidateVoucher = async () => {
    if (!voucherCode.trim() || !planId) return;

    setVoucherLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-voucher', {
        body: { code: voucherCode.trim(), planId }
      });

      if (error) throw error;

      if (data.valid) {
        setAppliedVoucher(data);
        toast({
          title: "Voucher aplicado!",
          description: data.is_free 
            ? "Parabéns! Seu primeiro mês é gratuito!" 
            : `Desconto de ${formatPrice(data.discount_amount)} aplicado.`,
        });
      } else {
        toast({
          title: "Voucher inválido",
          description: data.error || "Código não encontrado ou expirado.",
          variant: "destructive",
        });
        setAppliedVoucher(null);
      }
    } catch (error: any) {
      console.error('Error validating voucher:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível validar o voucher.",
        variant: "destructive",
      });
    } finally {
      setVoucherLoading(false);
    }
  };

  // Remove voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
  };

  // Handle subscription
  const handleSubscribe = async () => {
    if (!user || !planId) return;

    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-creator-subscription', {
        body: { 
          planId,
          voucherCode: appliedVoucher?.voucher?.code || null
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err: any) {
      console.error('Error creating subscription:', err);
      toast({
        title: "Erro",
        description: err.message || "Não foi possível iniciar a assinatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) return null;

  const credits = plan.credits || 1;
  const PlanIcon = plan.id.includes('studio') ? Crown : plan.id.includes('pro') ? Star : Zap;
  const isPopular = plan.is_popular || plan.id.includes('creator_pro');
  const displayPrice = plan.price_promo_cents || plan.price_cents;
  const pricePerMusic = Math.round(displayPrice / credits);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background py-12 px-4">
      <SEO 
        title={`Checkout - ${plan.name}`}
        description={`Assine o plano ${plan.name} e crie até ${credits} músicas por mês.`}
      />
      
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/planos#creator')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos planos
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card className={`relative ${
            isPopular 
              ? "ring-2 ring-purple-500 border-purple-500/50 shadow-lg shadow-purple-500/20" 
              : "border-border/50"
          }`}>
            {isPopular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-4 py-1">
                ⭐ Mais Popular
              </Badge>
            )}

            <CardHeader className="text-center pb-4 pt-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                  <PlanIcon className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl mb-2">{plan.name}</CardTitle>
              <CardDescription className="text-xl text-muted-foreground">
                Assinatura mensal
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Music className="w-5 h-5 text-purple-400" />
                  <span className="text-lg font-semibold text-purple-400">{credits} músicas/mês</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  = {formatPrice(pricePerMusic)} por música
                </p>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-purple-500/20 mt-0.5">
                      <Check className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <div className="space-y-6">
            {/* Voucher Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  Usar voucher
                </CardTitle>
                <CardDescription>
                  Tem um código de desconto? Aplique aqui
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appliedVoucher ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-green-400" />
                          <span className="font-semibold text-green-400">
                            {appliedVoucher.voucher?.code}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleRemoveVoucher}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Remover
                        </Button>
                      </div>
                      <p className="text-sm text-green-400/80 mt-2">
                        {appliedVoucher.voucher?.discount_type === 'percent' 
                          ? `${appliedVoucher.voucher.discount_value}% de desconto`
                          : `${formatPrice(appliedVoucher.discount_amount)} de desconto`
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                    <Button 
                      onClick={handleValidateVoucher}
                      disabled={!voucherCode.trim() || voucherLoading}
                      variant="secondary"
                    >
                      {voucherLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Aplicar"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price Summary */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{plan.name} (mensal)</span>
                  <span>{formatPrice(displayPrice)}</span>
                </div>

                {appliedVoucher && appliedVoucher.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Desconto do voucher</span>
                    <span>-{formatPrice(appliedVoucher.discount_amount)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-lg">Total</span>
                    <div className="text-right">
                      {appliedVoucher ? (
                        <>
                          {appliedVoucher.discount_amount > 0 && (
                            <span className="text-sm text-muted-foreground line-through mr-2">
                              {formatPrice(displayPrice)}
                            </span>
                          )}
                          <span className="text-2xl font-bold text-purple-400">
                            {formatPrice(appliedVoucher.final_price)}
                          </span>
                          {appliedVoucher.is_free && (
                            <p className="text-xs text-green-400 mt-1">1º mês grátis!</p>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-purple-400">
                          {formatPrice(displayPrice)}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">/mês</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/30"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Assinar {plan.name}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Você será redirecionado para o pagamento seguro. 
                  Cancele quando quiser sem multas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorCheckout;
