import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  icon: React.ReactNode;
  buttonText: string;
  buttonVariant: "default" | "outline" | "secondary";
}

const PricingPlans = () => {
  const navigate = useNavigate();
  const plans: PricingPlan[] = [
    {
      id: "free",
      name: "Grátis",
      price: "R$ 0",
      description: "Perfeito para experimentar",
      icon: <Star className="w-6 h-6" />,
      features: [
        "1 música por dia",
        "Letra personalizada",
        "Qualidade padrão",
        "Acesso básico",
      ],
      buttonText: "Começar Grátis",
      buttonVariant: "outline",
    },
    {
      id: "single",
      name: "Música Única",
      price: "R$ 19,90",
      description: "Para momentos especiais",
      icon: <Zap className="w-6 h-6" />,
      features: [
        "1 música completa",
        "2 letras personalizadas para escolher",
        "Letra + áudio profissional",
        "Alta qualidade",
        "Entrega por WhatsApp",
        "Suporte prioritário",
      ],
      buttonText: "Criar Música",
      buttonVariant: "default",
    },
    {
      id: "package",
      name: "Pacote 3 Músicas",
      price: "R$ 49,90",
      description: "Ideal para criativos",
      icon: <Check className="w-6 h-6" />,
      features: [
        "3 músicas completas",
        "2 letras personalizadas cada",
        "Economia de 16%",
        "Letra + áudio profissional",
        "Alta qualidade",
        "Entrega por WhatsApp",
        "Suporte VIP",
      ],
      popular: true,
      buttonText: "Pacote Popular",
      buttonVariant: "default",
    },
    {
      id: "subscription",
      name: "Assinatura Mensal",
      price: "R$ 69,90",
      description: "Para quem cria muito",
      icon: <Crown className="w-6 h-6" />,
      features: [
        "Até 5 músicas por mês",
        "2 letras personalizadas cada",
        "Letra + áudio profissional",
        "Qualidade premium",
        "Entrega instantânea",
        "Suporte 24/7",
        "Acesso antecipado",
        "Cancelamento a qualquer momento",
      ],
      buttonText: "Assinar Agora",
      buttonVariant: "secondary",
    },
  ];

  const handlePlanSelect = (planId: string) => {
    // Levar o usuário para o Briefing antes de criar
    navigate("/briefing");
  };

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

    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {plans.map((plan) => (
            <Card
              key={plan.id}
      className={`relative transition-all duration-300 hover:shadow-xl h-full flex flex-col ${
                plan.popular
                  ? "ring-2 ring-purple-500 shadow-lg scale-105"
                  : "hover:shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl text-gray-900">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  {plan.price}
                  {plan.id === "subscription" && (
                    <span className="text-sm font-normal text-gray-500">/mês</span>
                  )}
                </div>
                <CardDescription className="text-gray-600 mt-2">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 mt-auto">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button
                    onClick={() => handlePlanSelect(plan.id)}
                    variant={plan.buttonVariant}
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        : ""
                    }`}
                  >
                    {plan.buttonText}
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
          <p className="text-sm text-gray-500">
            Todos os planos incluem garantia de satisfação. Se não gostar, devolvemos seu dinheiro.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
