import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PlanTypeToggle from "@/components/PlanTypeToggle";

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

// Helper function to calculate instrumental price (20% off, rounded to .90)
const getInstrumentalPriceCents = (cents: number): number => {
  const discounted = cents * 0.8;
  // Round to nearest 10 cents ending in 90 (e.g., 1590, 7990, 8790)
  const rounded = Math.round(discounted / 100) * 100 - 10;
  return rounded > 0 ? rounded : Math.round(discounted);
};

const formatPrice = (cents: number) => {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
};

// Features for instrumental plans (without lyrics mentions)
const getInstrumentalFeatures = (planId: string): string[] => {
  switch (planId) {
    case "single":
      return ["1 música instrumental completa", "Arranjo personalizado", "Áudio profissional", "Alta qualidade", "Entrega por WhatsApp"];
    case "package":
      return ["3 músicas instrumentais completas", "Arranjos personalizados", "Economia de 16%", "Áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte VIP"];
    case "subscription":
      return ["Até 5 músicas instrumentais", "Arranjos personalizados", "Áudio profissional", "Qualidade premium", "Entrega por WhatsApp", "Prioridade na fila"];
    default:
      return [];
  }
};

const PricingPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInstrumental, setIsInstrumental] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .not('id', 'like', '%_instrumental')  // Filter out instrumental variants
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        // Fallback to static plans
        setPlans([
          {
            id: "single",
            name: "Música Única",
            price_display: "R$ 47,90",
            price_cents: 4790,
            price_promo_cents: 1990,
            features: ["1 música completa", "2 letras personalizadas para escolher", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp"] as string[],
            is_popular: false,
            is_active: true,
            sort_order: 1
          },
          {
            id: "package",
            name: "Pacote 3 Músicas",
            price_display: "R$ 99,90",
            price_cents: 9990,
            price_promo_cents: null,
            features: ["3 músicas completas", "2 letras personalizadas cada", "Economia de 16%", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte VIP"] as string[],
            is_popular: true,
            is_active: true,
            sort_order: 2
          },
          {
            id: "subscription",
            name: "Pacote 5 Músicas",
            price_display: "R$ 109,90",
            price_cents: 10990,
            price_promo_cents: null,
            features: ["Até 5 músicas", "2 letras personalizadas cada", "Letra + áudio profissional", "Qualidade premium", "Entrega por WhatsApp", "Prioridade na fila"] as string[],
            is_popular: false,
            is_active: true,
            sort_order: 3
          }
        ]);
      } else {
        // Map data to ensure features is an array
        const mappedData = (data || []).map(item => ({
          ...item,
          features: Array.isArray(item.features) ? item.features as string[] : []
        }));
        setPlans(mappedData);
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
    switch (planId) {
      case "single":
        return "Criar Música";
      case "package":
        return "Pacote Popular";
      case "subscription":
        return "Melhor Valor";
      default:
        return "Escolher";
    }
  };

  const getDisplayPrice = (plan: PricingPlan) => {
    if (isInstrumental) {
      // For instrumental: always show original price (with 20% off) and promo price (with 20% off) if exists
      const instrumentalOriginalCents = getInstrumentalPriceCents(plan.price_cents);
      const instrumentalPromoCents = plan.price_promo_cents ? getInstrumentalPriceCents(plan.price_promo_cents) : null;
      
      return {
        price: instrumentalPromoCents ? formatPrice(instrumentalPromoCents) : formatPrice(instrumentalOriginalCents),
        originalPrice: instrumentalPromoCents ? formatPrice(instrumentalOriginalCents) : null,
        hasPromo: !!instrumentalPromoCents
      };
    }
    return {
      price: plan.price_promo_cents ? formatPrice(plan.price_promo_cents) : plan.price_display,
      originalPrice: plan.price_promo_cents ? plan.price_display : null,
      hasPromo: !!plan.price_promo_cents
    };
  };

  const handlePlanSelect = (planId: string) => {
    navigate("/briefing", { state: { isInstrumental } });
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
            Escolha Seu Plano
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Transforme suas histórias em músicas incríveis. Escolha o plano que melhor se adapta às suas necessidades.
          </p>
          
          {/* Toggle Vocal/Instrumental */}
          <PlanTypeToggle 
            isInstrumental={isInstrumental} 
            onToggle={setIsInstrumental}
            className="mb-4"
          />
          
          {isInstrumental && (
            <Badge className="bg-accent/20 text-accent border-accent/30 animate-pulse">
              🎹 Músicas instrumentais com 20% de desconto!
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center">
          {plans.map(plan => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-xl h-full flex flex-col ${
                plan.is_popular 
                  ? "ring-2 ring-primary shadow-lg scale-105" 
                  : "hover:shadow-lg"
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}

              {!isInstrumental && plan.price_promo_cents && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-destructive text-destructive-foreground px-3 py-1 animate-pulse">
                    🔥 PROMOÇÃO
                  </Badge>
                </div>
              )}

              {isInstrumental && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-accent text-accent-foreground px-3 py-1">
                    -20%
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
                        <div className={`text-3xl font-bold ${isInstrumental ? 'text-accent' : 'text-green-500'}`}>
                          {priceInfo.price}
                        </div>
                      </div>
                    ) : (
                      <div className={`text-3xl font-bold ${isInstrumental ? 'text-accent' : 'text-primary'}`}>
                        {priceInfo.price}
                        {plan.id === "subscription" && (
                          <span className="text-sm font-normal text-muted-foreground">/mês</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                <CardDescription className="mt-2 text-muted-foreground">
                  {plan.id === "single" && (isInstrumental ? "Trilha instrumental única" : "Para momentos especiais")}
                  {plan.id === "package" && (isInstrumental ? "Trilhas para projetos" : "Ideal para criativos")}
                  {plan.id === "subscription" && (isInstrumental ? "Trilhas ilimitadas" : "Para quem cria muito")}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 mt-auto">
                <ul className="space-y-3 flex-1 text-center">
                  {(isInstrumental ? getInstrumentalFeatures(plan.id) : (plan.features as string[])).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${isInstrumental ? 'text-accent' : 'text-green-500'}`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button 
                    onClick={() => handlePlanSelect(plan.id)} 
                    variant={plan.is_popular ? "default" : "outline"}
                    className={`w-full ${
                      plan.is_popular 
                        ? isInstrumental 
                          ? "bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white"
                          : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white" 
                        : ""
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
            💳 Aceitamos Pix, cartão de crédito e débito
          </p>
          <p className="text-sm text-muted-foreground">
            {isInstrumental ? "🎹 Músicas instrumentais com 20% de desconto" : "Garantia de satisfação."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;