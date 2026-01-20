import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        // Fallback to static plans
        setPlans([
          {
            id: "single",
            name: "Música Única",
            price_display: "R$ 29,90",
            price_cents: 2990,
            price_promo_cents: 990,
            features: ["1 música completa", "2 letras personalizadas para escolher", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte prioritário"] as string[],
            is_popular: false,
            is_active: true,
            sort_order: 1
          },
          {
            id: "package",
            name: "Pacote 3 Músicas",
            price_display: "R$ 49,90",
            price_cents: 4990,
            price_promo_cents: null,
            features: ["3 músicas completas", "2 letras personalizadas cada", "Economia de 16%", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte VIP"] as string[],
            is_popular: true,
            is_active: true,
            sort_order: 2
          },
          {
            id: "subscription",
            name: "Assinatura Mensal",
            price_display: "R$ 69,90",
            price_cents: 6990,
            price_promo_cents: null,
            features: ["Até 5 músicas por mês", "2 letras personalizadas cada", "Letra + áudio profissional", "Qualidade premium", "Entrega instantânea", "Suporte 24/7", "Acesso antecipado", "Cancelamento a qualquer momento"] as string[],
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
        return "Assinar Agora";
      default:
        return "Escolher";
    }
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const handlePlanSelect = (planId: string) => {
    navigate("/briefing");
  };

  if (loading) {
    return (
      <div className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Escolha Seu Plano
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transforme suas histórias em músicas incríveis. Escolha o plano que melhor se adapta às suas necessidades.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-center">
          {plans.map(plan => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-xl h-full flex flex-col ${
                plan.is_popular 
                  ? "ring-2 ring-purple-500 shadow-lg scale-105" 
                  : "hover:shadow-lg"
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}

              {plan.price_promo_cents && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-red-500 text-white px-3 py-1 animate-pulse">
                    🔥 PROMOÇÃO
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[#8c58c6]">
                  {getIcon(plan.id)}
                </div>
                <CardTitle className="text-2xl text-pink-600">{plan.name}</CardTitle>
                
                <div className="mt-2">
                  {plan.price_promo_cents ? (
                    <div className="space-y-1">
                      <div className="text-lg text-gray-400 line-through">
                        {plan.price_display}
                      </div>
                      <div className="text-3xl font-bold text-green-500">
                        {formatPrice(plan.price_promo_cents)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-purple-600">
                      {plan.price_display}
                      {plan.id === "subscription" && (
                        <span className="text-sm font-normal text-gray-500">/mês</span>
                      )}
                    </div>
                  )}
                </div>
                
                <CardDescription className="mt-2 text-gray-50">
                  {plan.id === "single" && "Para momentos especiais"}
                  {plan.id === "package" && "Ideal para criativos"}
                  {plan.id === "subscription" && "Para quem cria muito"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 mt-auto">
                <ul className="space-y-3 flex-1 text-center">
                  {(plan.features as string[]).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-50">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button 
                    onClick={() => handlePlanSelect(plan.id)} 
                    variant={plan.is_popular ? "default" : "outline"}
                    className={`w-full ${
                      plan.is_popular 
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white" 
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
          <p className="text-gray-600 mb-4">
            💳 Aceitamos Pix, cartão de crédito e débito
          </p>
          <p className="text-sm text-gray-500">Garantia de satisfação.</p>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;