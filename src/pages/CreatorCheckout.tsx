import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, Loader2, Tag, Music, ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n-format";

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

const CreatorCheckout = () => {
  const { planId } = useParams<{ planId: string }>();
  const { t, i18n } = useTranslation("pricing");
  const formatPrice = (cents: number) => formatCurrency(cents, i18n.language, { convert: true });
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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
        navigate('/criadores');
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
            title: t("creatorCheckout.notFound"),
            description: t("creatorCheckout.notFoundDescription"),
            variant: "destructive",
          });
          navigate('/criadores');
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
          title: t("creatorCheckout.error"),
          description: t("creatorCheckout.loadError"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, navigate, toast, t]);

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
          title: t("creatorCheckout.voucherApplied"),
          description: data.is_free 
            ? t("creatorCheckout.firstMonth") 
            : t("creatorCheckout.discountApplied", { amount: formatPrice(data.discount_amount) }),
        });
      } else {
        toast({
          title: t("creatorCheckout.voucherInvalid"),
          description: data.error || t("creatorCheckout.voucherInvalidDescription"),
          variant: "destructive",
        });
        setAppliedVoucher(null);
      }
    } catch (error: any) {
      console.error('Error validating voucher:', error);
      toast({
        title: t("creatorCheckout.error"),
        description: error.message || t("creatorCheckout.voucherError"),
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
        title: t("creatorCheckout.error"),
        description: err.message || t("creatorCheckout.subscribeError"),
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
        noIndex
        title={`${t("creatorCheckout.summary")} - ${plan.name}`}
        description={t("creatorLanding.credits", { count: credits })}
      />
      
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/criadores#assinaturas')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("creatorCheckout.back")}
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card className={`relative ${
            isPopular 
              ? "ring-2 ring-primary border-primary/50 shadow-lg shadow-primary/20" 
              : "border-border/50"
          }`}>
            {isPopular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold px-4 py-1">
                {t("popular")}
              </Badge>
            )}

            <CardHeader className="text-center pb-4 pt-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/30">
                  <PlanIcon className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-3xl mb-2">{plan.name}</CardTitle>
              <CardDescription className="text-xl text-muted-foreground">
                {t("creatorCheckout.monthly")}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Music className="w-5 h-5 text-primary" />
                  <span className="text-lg font-semibold text-primary">{t("creatorLanding.credits", { count: credits })}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("pricePerMusic", { price: formatPrice(pricePerMusic) })}
                </p>
              </div>

              <ul className="space-y-3">
                {(t("creatorLanding.planFeatures", { returnObjects: true }) as string[]).map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-primary/20 mt-0.5">
                      <Check className="w-3 h-3 text-primary flex-shrink-0" />
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
                  {t("creatorCheckout.voucher")}
                </CardTitle>
                <CardDescription>
                  {t("creatorCheckout.voucherHint")}
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
                          {t("creatorCheckout.remove")}
                        </Button>
                      </div>
                      <p className="text-sm text-green-400/80 mt-2">
                        {appliedVoucher.voucher?.discount_type === 'percent' 
                          ? t("creatorCheckout.discountPercent", { percent: appliedVoucher.voucher.discount_value })
                          : t("creatorCheckout.discountAmount", { amount: formatPrice(appliedVoucher.discount_amount) })
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("creatorCheckout.code")}
                      aria-label={t("creatorCheckout.code")}
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
                        t("creatorCheckout.apply")
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price Summary */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t("creatorCheckout.summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{plan.name} ({t("creatorLanding.month")})</span>
                  <span>{formatPrice(displayPrice)}</span>
                </div>

                {appliedVoucher && appliedVoucher.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>{t("creatorCheckout.discount")}</span>
                    <span>-{formatPrice(appliedVoucher.discount_amount)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-lg">{t("creatorCheckout.total")}</span>
                    <div className="text-right">
                      {appliedVoucher ? (
                        <>
                          {appliedVoucher.discount_amount > 0 && (
                            <span className="text-sm text-muted-foreground line-through mr-2">
                              {formatPrice(displayPrice)}
                            </span>
                          )}
                          <span className="text-2xl font-bold text-primary">
                            {formatPrice(appliedVoucher.final_price)}
                          </span>
                          {appliedVoucher.is_free && (
                            <p className="text-xs text-green-400 mt-1">{t("creatorCheckout.firstMonth")}</p>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(displayPrice)}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">/{t("creatorLanding.month")}</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/30"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("creatorCheckout.processing")}
                    </>
                  ) : (
                    <>
                      {t("creator.subscribe", { plan: plan.name })}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  {t("creatorCheckout.secure")}
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
