import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n-format";
import { motion } from "framer-motion";

interface PricingPlan {
  id: string;
  name: string;
  price_display: string;
  price_cents: number;
  price_promo_cents: number | null;
  credits: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

const PricingPlans = () => {
  const navigate = useNavigate();
  const { t, i18n, ready } = useTranslation('pricing');
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Format price according to locale with real currency conversion
  const formatPrice = (cents: number) => {
    return formatCurrency(cents, i18n.language, { convert: true });
  };

  // Get translated features for universal plans
  const getUniversalFeatures = (planId: string): string[] => {
    const features = t(`vocalFeatures.${planId}`, { returnObjects: true });
    if (Array.isArray(features) && features.length > 0 && typeof features[0] === 'string') {
      return features as string[];
    }
    // Fallback with 24h delivery
    switch (planId) {
      case "single":
        return ["1 universal credit", "Use for vocal, instrumental or custom lyrics", "Professional audio", "Premium quality", "Delivery within 24h", "Use anytime, no deadline!"];
      case "package":
        return ["3 universal credits", "Use for any type of music", "16% savings", "Professional audio", "Premium quality", "Delivery within 24h", "VIP support"];
      case "subscription":
        return ["5 universal credits", "Best value", "Premium quality", "Delivery within 24h", "Priority queue"];
      default:
        return [];
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .in('id', ['single', 'package', 'subscription'])
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        setPlans([
          { id: "single", name: "1 Crédito", price_display: "R$ 9,90", price_cents: 990, price_promo_cents: null, credits: 1, features: [], is_popular: false, is_active: true, sort_order: 1 },
          { id: "package", name: "3 Créditos", price_display: "R$ 24,90", price_cents: 2490, price_promo_cents: null, credits: 3, features: [], is_popular: true, is_active: true, sort_order: 2 },
          { id: "subscription", name: "5 Créditos", price_display: "R$ 39,90", price_cents: 3990, price_promo_cents: null, credits: 5, features: [], is_popular: false, is_active: true, sort_order: 3 }
        ]);
      } else {
        const mappedPlans = (data || []).map(item => ({
          ...item,
          credits: item.credits || 1,
          features: Array.isArray(item.features) ? item.features as string[] : []
        }));
        setPlans(mappedPlans);
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

  const getButtonText = (plan: PricingPlan) => {
    if (plan.credits > 1) {
      return t('ctaCredits', { credits: plan.credits });
    }
    return t('cta');
  };

  const getDisplayPrice = (plan: PricingPlan) => {
    return {
      price: plan.price_promo_cents ? formatPrice(plan.price_promo_cents) : formatPrice(plan.price_cents),
      originalPrice: plan.price_promo_cents ? formatPrice(plan.price_cents) : null,
      hasPromo: !!plan.price_promo_cents
    };
  };

  const handlePlanSelect = (planId: string) => {
    const params = new URLSearchParams();
    params.set('planId', planId);
    navigate(`/briefing?${params.toString()}`);
  };

  if (loading || !ready) {
    return (
      <div className="section-spacing gradient-section" id="planos">
        <div className="max-w-7xl mx-auto text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing gradient-section" id="planos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{t('title')}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-2 leading-relaxed">
            {t('noContract')}
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('choosePlan')}
          </p>
          
          <Badge className="bg-primary/20 text-primary border-primary/30">
            🎵 {t('universal.badge', { defaultValue: 'Créditos universais - use para qualquer tipo de música' })}
          </Badge>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card 
                className={`relative h-full flex flex-col transition-all duration-500 ${
                  plan.is_popular 
                    ? "premium-card ring-2 ring-primary shadow-2xl scale-105" 
                    : "premium-card"
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-5 py-1.5 shadow-lg font-semibold">
                      {t('popular')}
                    </Badge>
                  </div>
                )}

                {plan.price_promo_cents && (
                  <div className="absolute -top-3 right-4 z-10">
                    <Badge className="bg-destructive text-destructive-foreground px-3 py-1 animate-pulse shadow-lg">
                      {t('badges.promo')}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4 pt-8">
                  <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg bg-gradient-to-br from-primary to-accent text-white`}>
                    {getIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl text-foreground">
                    {plan.name}
                  </CardTitle>
                  
                  <div className="mt-4">
                    {(() => {
                      const priceInfo = getDisplayPrice(plan);
                      return priceInfo.originalPrice ? (
                        <div className="space-y-1">
                          <div className="text-lg text-muted-foreground line-through">
                            {priceInfo.originalPrice}
                          </div>
                          <div className="text-4xl font-bold gradient-text">
                            {priceInfo.price}
                          </div>
                        </div>
                      ) : (
                        <div className="text-4xl font-bold gradient-text">
                          {priceInfo.price}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <CardDescription className="mt-3 text-muted-foreground">
                    {plan.id === "single" && t('plans.single.description')}
                    {plan.id === "package" && t('plans.package.description')}
                    {plan.id === "subscription" && t('plans.subscription.description')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 mt-auto pb-8">
                  <ul className="space-y-3 flex-1">
                    {getUniversalFeatures(plan.id).map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 bg-primary/20">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 pt-4">
                    <Button 
                      onClick={() => handlePlanSelect(plan.id)} 
                      className={`w-full rounded-xl py-6 text-base font-semibold ${
                        plan.is_popular 
                          ? "bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg" 
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      }`}
                    >
                      {getButtonText(plan)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-muted-foreground mb-2">
            {t('footer.payment')}
          </p>
          <p className="text-sm text-muted-foreground/70">
            {t('footer.satisfaction')}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPlans;
