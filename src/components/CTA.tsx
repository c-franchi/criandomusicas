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
import { motion } from "framer-motion";

interface PricingConfig {
  id: string;
  name: string;
  price_display: string;
  price_cents: number;
  price_promo_cents: number | null;
}

const CTA = () => {
  const { t, i18n } = useTranslation('home');
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
    : formatPrice(2990);
  const displayPrice = promoPrice || originalPrice;

  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Premium background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'var(--gradient-primary)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ background: 'var(--gradient-primary)' }}
        />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-6 bg-gradient-to-r from-accent/20 to-primary/20 text-accent border-accent/30 px-4 py-2">
            <Zap className="w-4 h-4 mr-2" />
            {t('cta.badge')}
          </Badge>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {t('cta.title')}{" "}
            <span className="gradient-text">{t('cta.titleHighlight')}</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('cta.subtitle')}
          </p>
        </motion.div>
        
        {/* Benefits */}
        <motion.div 
          className="grid sm:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {Array.isArray(benefits) && benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 text-left glass-card rounded-xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-accent" />
              </div>
              <span className="text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </motion.div>
        
        {/* Pricing or Credits Display */}
        <motion.div 
          className="premium-card p-8 mb-10 max-w-md mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {user && hasCredits ? (
            <>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-success" />
                </div>
                <span className="text-5xl font-bold text-success">{totalAvailable}</span>
              </div>
              <div className="text-success font-medium mb-2 text-lg">
                {totalAvailable !== 1 ? t('cta.creditsAvailablePlural') : t('cta.creditsAvailable')}
              </div>
              <div className="text-sm text-muted-foreground">
                {t('cta.freeNextSong')}
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl font-bold gradient-text mb-2">{displayPrice}</div>
              <div className="text-muted-foreground mb-4">{t('cta.completeSong')}</div>
              {promoPrice && (
                <div className="text-sm text-muted-foreground">
                  <span className="line-through">{originalPrice}</span> • {t('cta.limitedPromo')}
                </div>
              )}
            </>
          )}
        </motion.div>
        
        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button 
            variant="hero" 
            size="lg" 
            className={`text-lg px-10 py-7 rounded-xl group shadow-2xl ${
              user && hasCredits 
                ? 'bg-gradient-to-r from-success to-emerald-500 hover:from-emerald-400 hover:to-green-400' 
                : ''
            }`}
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
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
