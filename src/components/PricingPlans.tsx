import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PlanTypeToggle from "@/components/PlanTypeToggle";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n-format";

interface PricingPlan {
  id: string;
  name: string;
  price_display: string;
  price_cents: number;
  price_promo_cents: number | null;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

const PricingPlans = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('pricing');
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [instrumentalPlans, setInstrumentalPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInstrumental, setIsInstrumental] = useState(false);

  // Format price according to locale with real currency conversion
  // USD for English, EUR for Spanish/Italian, BRL for Portuguese
  const formatPrice = (cents: number) => {
    return formatCurrency(cents, i18n.language, { convert: true });
  };

  // Get translated features for vocal plans
  const getVocalFeatures = (planId: string): string[] => {
    const features = t(`vocalFeatures.${planId}`, { returnObjects: true }) as string[];
    if (Array.isArray(features)) return features;
    // Fallback if translation not available
    switch (planId) {
      case "single":
        return ["1 complete song", "2 personalized lyrics to choose", "Lyrics + professional audio", "High quality", "Delivery within 48h"];
      case "package":
        return ["3 complete songs", "2 personalized lyrics each", "16% savings", "Lyrics + professional audio", "High quality", "Delivery within 48h", "VIP support"];
      case "subscription":
        return ["Up to 5 songs", "2 personalized lyrics each", "Lyrics + professional audio", "Premium quality", "Delivery within 48h", "Priority queue"];
      default:
        return [];
    }
  };

  // Features for instrumental plans
  const getInstrumentalFeatures = (planId: string): string[] => {
    const features = t(`instrumentalFeatures.${planId}`, { returnObjects: true }) as string[];
    if (Array.isArray(features)) return features;
    // Fallback if translation not available
    switch (planId) {
      case "single":
        return ["1 instrumental track", "Custom arrangement", "Professional audio", "High quality", "Delivery within 48h"];
      case "package":
        return ["3 instrumental tracks", "Custom arrangements", "16% savings", "Professional audio", "VIP support"];
      case "subscription":
        return ["Up to 5 instrumental tracks", "Custom arrangements", "Premium quality", "Priority queue"];
      default:
        return [];
    }
  };
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      const [vocalResult, instrumentalResult] = await Promise.all([
        supabase
          .from('pricing_config')
          .select('*')
          .eq('is_active', true)
          .not('id', 'like', '%_instrumental')
          .neq('id', 'single_custom_lyric')
          .order('sort_order', { ascending: true }),
        supabase
          .from('pricing_config')
          .select('*')
          .eq('is_active', true)
          .like('id', '%_instrumental')
          .order('sort_order', { ascending: true })
      ]);

      if (vocalResult.error) {
        console.error('Error fetching plans:', vocalResult.error);
        // Fallback plans
        setPlans([
          { id: "single", name: "Música Única", price_display: "R$ 9,90", price_cents: 990, price_promo_cents: null, features: [], is_popular: false, is_active: true, sort_order: 1 },
          { id: "package", name: "Pacote 3 Músicas", price_display: "R$ 24,90", price_cents: 2490, price_promo_cents: null, features: [], is_popular: true, is_active: true, sort_order: 2 },
          { id: "subscription", name: "Pacote 5 Músicas", price_display: "R$ 39,90", price_cents: 3990, price_promo_cents: null, features: [], is_popular: false, is_active: true, sort_order: 3 }
        ]);
        setInstrumentalPlans([
          { id: "single_instrumental", name: "Instrumental Única", price_display: "R$ 7,90", price_cents: 790, price_promo_cents: null, features: [], is_popular: false, is_active: true, sort_order: 1 },
          { id: "package_instrumental", name: "Pacote 3 Instrumentais", price_display: "R$ 19,90", price_cents: 1990, price_promo_cents: null, features: [], is_popular: true, is_active: true, sort_order: 2 },
          { id: "subscription_instrumental", name: "Pacote 5 Instrumentais", price_display: "R$ 31,90", price_cents: 3190, price_promo_cents: null, features: [], is_popular: false, is_active: true, sort_order: 3 }
        ]);
      } else {
        const mappedVocal = (vocalResult.data || []).map(item => ({
          ...item,
          features: Array.isArray(item.features) ? item.features as string[] : []
        }));
        setPlans(mappedVocal);
        
        const mappedInstrumental = (instrumentalResult.data || []).map(item => ({
          ...item,
          features: Array.isArray(item.features) ? item.features as string[] : []
        }));
        setInstrumentalPlans(mappedInstrumental);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const getIcon = (planId: string) => {
    switch (planId) {
      case "single":
        return <Zap className="w-6 h-6" />;
      case "package":
        return <Check className="w-6 h-6" />;
      case "subscription":
        return <Crown className="w-6 h-6" />;
      default:
        return <Music className="w-6 h-6" />;
    }
  };

  const getButtonText = (planId: string) => {
    const credits = planId === 'subscription' ? 5 : planId === 'package' ? 3 : 1;
    if (credits > 1) {
      return t('ctaCredits', { credits });
    }
    return t('cta');
  };

  const getInstrumentalPlan = (vocalPlanId: string): PricingPlan | null => {
    const instrumentalId = `${vocalPlanId}_instrumental`;
    return instrumentalPlans.find(p => p.id === instrumentalId) || null;
  };

  const getDisplayPrice = (plan: PricingPlan) => {
    if (isInstrumental) {
      const instPlan = getInstrumentalPlan(plan.id);
      if (instPlan) {
        return {
          price: formatPrice(instPlan.price_promo_cents || instPlan.price_cents),
          originalPrice: instPlan.price_promo_cents ? formatPrice(instPlan.price_cents) : null,
          hasPromo: !!instPlan.price_promo_cents
        };
      }
      return { price: formatPrice(plan.price_cents), originalPrice: null, hasPromo: false };
    }
    return {
      price: plan.price_promo_cents ? formatPrice(plan.price_promo_cents) : formatPrice(plan.price_cents),
      originalPrice: plan.price_promo_cents ? formatPrice(plan.price_cents) : null,
      hasPromo: !!plan.price_promo_cents
    };
  };

  const handlePlanSelect = (planId: string) => {
    const finalPlanId = isInstrumental ? `${planId}_instrumental` : planId;
    const params = new URLSearchParams();
    params.set('planId', finalPlanId);
    if (isInstrumental) {
      params.set('instrumental', 'true');
    }
    navigate(`/briefing?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="py-16 bg-secondary/20" id="planos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-secondary/20" id="planos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold gradient-text mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-2">
            {t('noContract')}
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('choosePlan')}
          </p>
          
          <PlanTypeToggle 
            isInstrumental={isInstrumental} 
            onToggle={setIsInstrumental}
            className="mb-4"
          />
          
          {isInstrumental && (
            <Badge className="bg-accent/20 text-accent border-accent/30 animate-pulse">
              {t('instrumental.discount')}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center">
          {plans.map(plan => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-xl h-full flex flex-col ${
                plan.is_popular ? "ring-2 ring-primary shadow-lg scale-105" : "hover:shadow-lg"
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1">
                    {t('popular')}
                  </Badge>
                </div>
              )}

              {!isInstrumental && plan.price_promo_cents && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-destructive text-destructive-foreground px-3 py-1 animate-pulse">
                    {t('badges.promo')}
                  </Badge>
                </div>
              )}

              {isInstrumental && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-accent text-accent-foreground px-3 py-1">
                    {t('instrumental.discountBadge')}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                  isInstrumental ? 'bg-accent' : 'bg-primary'
                }`}>
                  {getIcon(plan.id)}
                </div>
                <CardTitle className={`text-2xl ${isInstrumental ? 'text-accent' : 'text-primary'}`}>
                  {isInstrumental ? `${plan.name} 🎹` : plan.name}
                </CardTitle>
                
                <div className="mt-2">
                  {(() => {
                    const priceInfo = getDisplayPrice(plan);
                    return priceInfo.originalPrice ? (
                      <div className="space-y-1">
                        <div className="text-lg text-muted-foreground line-through">
                          {priceInfo.originalPrice}
                        </div>
                        <div className={`text-3xl font-bold ${isInstrumental ? 'text-accent' : 'text-primary'}`}>
                          {priceInfo.price}
                        </div>
                      </div>
                    ) : (
                      <div className={`text-3xl font-bold ${isInstrumental ? 'text-accent' : 'text-primary'}`}>
                        {priceInfo.price}
                        {plan.id === "subscription" && (
                          <span className="text-sm font-normal text-muted-foreground">
                            {t('comparison.subscription.perMonth')}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                <CardDescription className="mt-2 text-muted-foreground">
                  {plan.id === "single" && (isInstrumental ? t('instrumental.single') : t('plans.single.description'))}
                  {plan.id === "package" && (isInstrumental ? t('instrumental.package') : t('plans.package.description'))}
                  {plan.id === "subscription" && (isInstrumental ? t('instrumental.subscription') : t('plans.subscription.description'))}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 mt-auto">
                <ul className="space-y-3 flex-1 text-center">
                  {(isInstrumental ? getInstrumentalFeatures(plan.id) : getVocalFeatures(plan.id)).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${isInstrumental ? 'text-accent' : 'text-primary'}`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button 
                    onClick={() => handlePlanSelect(plan.id)} 
                    variant="default"
                    className={`w-full ${
                      plan.is_popular 
                        ? isInstrumental 
                          ? "bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white"
                          : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white" 
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    {getButtonText(plan.id)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            {t('footer.payment')}
          </p>
          <p className="text-sm text-muted-foreground">
            {isInstrumental ? t('instrumental.discount') : t('footer.satisfaction')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
