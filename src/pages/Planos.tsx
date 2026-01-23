import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLANS, Plan, getPlanInfo } from "@/lib/plan";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PlanTypeToggle from "@/components/PlanTypeToggle";
import SEO from "@/components/SEO";

// Helper function to calculate instrumental price (20% off)
const getInstrumentalPrice = (originalPrice: string): string => {
  const numericValue = parseFloat(originalPrice.replace("R$ ", "").replace(",", "."));
  const discountedValue = numericValue * 0.8;
  return `R$ ${discountedValue.toFixed(2).replace(".", ",")}`;
};

const Planos = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isInstrumental, setIsInstrumental] = useState(false);

  const getPlanIcon = (planId: Plan) => {
    switch (planId) {
      case "single":
        return <Zap className="w-6 h-6" />;
      case "package":
        return <Check className="w-6 h-6" />;
      case "subscription":
        return <Crown className="w-6 h-6" />;
      default:
        return <Zap className="w-6 h-6" />;
    }
  };

  const handleSelectPlan = async (planId: Plan) => {
    if (!user || !profile) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para escolher um plano.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Atualizar plano no Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ plan: planId })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Plano selecionado!",
        description: `Você escolheu o plano ${getPlanInfo(planId)?.title}.`,
      });

      // Redirecionar para o Briefing, passando se é instrumental via URL param
      if (isInstrumental) {
        navigate("/briefing?instrumental=true");
      } else {
        navigate("/briefing");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua escolha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Get current prices based on instrumental toggle
  const getDisplayPrice = (plan: typeof PLANS[0]) => {
    if (isInstrumental) {
      return {
        price: plan.pricePromo ? getInstrumentalPrice(plan.pricePromo) : getInstrumentalPrice(plan.price),
        originalPrice: plan.pricePromo ? getInstrumentalPrice(plan.price) : null,
        hasPromo: !!plan.pricePromo
      };
    }
    return {
      price: plan.pricePromo || plan.price,
      originalPrice: plan.pricePromo ? plan.price : null,
      hasPromo: !!plan.pricePromo
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background py-12 px-6">
      <SEO 
        canonical="/planos"
        title="Planos e Preços"
        description="Escolha o plano ideal para criar sua música personalizada. Opções a partir de R$ 47,90 com entrega em até 48h. Pacotes para músicas vocais e instrumentais."
        keywords="planos música personalizada, preços música IA, pacote músicas, assinatura música, quanto custa música personalizada"
      />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-r from-primary to-accent music-glow">
              <Crown className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold gradient-text">Escolha Seu Plano</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Transforme suas histórias em músicas incríveis. Escolha o plano ideal para você.
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

        {/* Plans Grid */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mb-16">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative h-full flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-2xl glass-card ${
                plan.id === "package" 
                  ? "ring-2 ring-primary music-glow border-primary/50" 
                  : "border-border/50 hover:border-primary/30"
              }`}
            >
              {plan.id === "package" && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold px-4 py-1">
                  Mais Popular
                </Badge>
              )}

              {plan.pricePromo && (
                <Badge className="absolute -top-3 right-4 bg-destructive text-destructive-foreground px-3 py-1 animate-pulse">
                  🔥 PROMOÇÃO
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className={`p-4 rounded-2xl ${
                    isInstrumental 
                      ? "bg-gradient-to-r from-accent to-primary music-glow"
                      : plan.id === "single" ? "bg-gradient-to-r from-primary to-accent music-glow" :
                        plan.id === "package" ? "bg-gradient-to-r from-primary to-accent music-glow" :
                        "bg-gradient-to-r from-accent to-primary music-glow"
                  }`}>
                    {React.cloneElement(getPlanIcon(plan.id), {
                      className: "w-8 h-8 text-white"
                    })}
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2 text-card-foreground font-bold">
                  {isInstrumental ? `${plan.title} 🎹` : plan.title}
                </CardTitle>
                
                {(() => {
                  const priceInfo = getDisplayPrice(plan);
                  return priceInfo.originalPrice ? (
                    <div className="space-y-1">
                      <CardDescription className="text-xl line-through text-muted-foreground">
                        {priceInfo.originalPrice}
                      </CardDescription>
                      <CardDescription className={`text-4xl font-bold ${isInstrumental ? 'text-accent' : 'text-green-500'}`}>
                        {priceInfo.price}
                    </CardDescription>
                  </div>
                  ) : (
                    <CardDescription className={`text-4xl font-bold ${isInstrumental ? 'text-accent' : 'gradient-text'}`}>
                      {priceInfo.price}
                    </CardDescription>
                  );
                })()}
                
                {plan.isSubscription && (
                  <p className="text-muted-foreground text-sm mt-1">por mês</p>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="p-1 rounded-full bg-primary/20 mt-0.5">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                      </div>
                      <span className="text-card-foreground leading-relaxed font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-3 font-semibold transition-all duration-300 ${
                      plan.id === "package" 
                        ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white music-glow" 
                        : plan.id === "subscription"
                        ? "bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white"
                        : ""
                    }`}
                    variant={plan.id === "single" && !plan.pricePromo ? "outline" : "default"}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center space-y-6">
          <div className="p-6 rounded-2xl glass-card border border-border/50">
            <p className="text-foreground font-medium mb-2">
              🎵 Garantia de satisfação de 100%
            </p>
            <p className="text-muted-foreground">
              Todos os planos incluem entrega em até 48h diretamente na plataforma e suporte técnico especializado
            </p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              ← Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planos;