import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PricingConfig {
  id: string;
  name: string;
  price_display: string;
  price_cents: number;
  price_promo_cents: number | null;
}

const CTA = () => {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  
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

  const benefits = [
    "2 versões de letras personalizadas", 
    "Entrega em até 48 horas", 
    "Música completa e profissional", 
    "Entrega automatizada na plataforma"
  ];

  // Calculate display values
  const promoPrice = pricing?.price_promo_cents 
    ? `R$ ${(pricing.price_promo_cents / 100).toFixed(2).replace('.', ',')}`
    : null;
  const originalPrice = pricing 
    ? `R$ ${(pricing.price_cents / 100).toFixed(2).replace('.', ',')}`
    : 'R$ 29,90';
  const displayPrice = promoPrice || originalPrice;

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <Badge className="mb-6 bg-accent text-accent-foreground">
          <Zap className="w-4 h-4 mr-2" />
          Oferta Especial
        </Badge>
        
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Transforme sua história em{" "}
          <span className="gradient-text">música única</span>
        </h2>
        
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Mais de 500 clientes já criaram suas músicas personalizadas. 
          Transforme qualquer momento em uma trilha sonora inesquecível.
        </p>
        
        {/* Benefits */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>
        
        {/* Pricing */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 mb-8 max-w-md mx-auto">
          <div className="text-4xl font-bold gradient-text mb-2">{displayPrice}</div>
          <div className="text-muted-foreground mb-4">Música completa personalizada</div>
          {promoPrice && (
            <div className="text-sm text-muted-foreground">
              <span className="line-through">{originalPrice}</span> • Promoção por tempo limitado
            </div>
          )}
        </div>
        
        {/* CTA Button */}
        <Button 
          variant="hero" 
          size="lg" 
          className="text-lg px-8 py-6 group"
          onClick={() => navigate('/criar-musica')}
        >
          Começar Agora
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </section>
  );
};

export default CTA;
