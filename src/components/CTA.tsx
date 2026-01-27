import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { formatCurrency } from "@/lib/i18n-format";

interface PricingConfig {
  id: string;
  name: string;
  price_display: string;
  price_cents: number;
  price_promo_cents: number | null;
}

const CTA = () => {
  const { t, i18n } = useTranslation('home');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasCredits, totalAvailable } = useCredits();
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  
  // Format price with currency conversion based on current language
  const formatPrice = (cents: number) => formatCurrency(cents, i18n.language, { convert: true });
  
  useEffect(() => {
    const fetchPricing = async () => {
      const { data } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('id', 'single')
        .eq('is_active', true)
        .maybeSingle();
      
      if (data) {
        setPricing(data);
      }
    };
    fetchPricing();
  }, []);

  // Get benefits from translations
  const benefits = t('cta.benefits', { returnObjects: true }) as string[];

  // Calculate display values with currency conversion
  const promoPrice = pricing?.price_promo_cents 
    ? formatPrice(pricing.price_promo_cents)
    : null;
  const originalPrice = pricing 
    ? formatPrice(pricing.price_cents)
    : formatPrice(2990); // Fallback: R$ 29,90
  const displayPrice = promoPrice || originalPrice;

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <Badge className="mb-6 bg-accent text-accent-foreground">
          <Zap className="w-4 h-4 mr-2" />
          {t('cta.badge')}
        </Badge>
        
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          {t('cta.title')}{" "}
          <span className="gradient-text">{t('cta.titleHighlight')}</span>
        </h2>
        
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('cta.subtitle')}
        </p>
        
        {/* Benefits */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
          {Array.isArray(benefits) && benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
        
        {/* Pricing or Credits Display */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 mb-8 max-w-md mx-auto">
          {user && hasCredits ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-8 h-8 text-green-400" />
                <span className="text-4xl font-bold text-green-400">{totalAvailable}</span>
              </div>
              <div className="text-green-400 font-medium mb-2">
                {totalAvailable !== 1 ? t('cta.creditsAvailablePlural') : t('cta.creditsAvailable')}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('cta.freeNextSong')}
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl font-bold gradient-text mb-2">{displayPrice}</div>
              <div className="text-muted-foreground mb-4">{t('cta.completeSong')}</div>
              {promoPrice && (
                <div className="text-sm text-muted-foreground">
                  <span className="line-through">{originalPrice}</span> • {t('cta.limitedPromo')}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* CTA Button */}
        <Button 
          variant="hero" 
          size="lg" 
          className={`text-lg px-8 py-6 group ${user && hasCredits ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400' : ''}`}
          onClick={() => navigate('/briefing')}
        >
          {user && hasCredits ? (
            <>
              <Zap className="w-5 h-5 mr-2" />
              {t('cta.useCredit')}
            </>
          ) : (
            <>
              {t('cta.createNow')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </section>
  );
};

export default CTA;