import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLANS, Plan, getPlanInfo } from "@/lib/plan";
import { useAuth } from "@/hooks/useAuth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const Planos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const getPlanIcon = (planId: Plan) => {
    switch (planId) {
      case "free":
        return <Star className="w-6 h-6" />;
      case "basic":
        return <Zap className="w-6 h-6" />;
      case "pro":
        return <Crown className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const handleSelectPlan = async (planId: Plan) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para escolher um plano.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Por enquanto, apenas simular a escolha (mock)
      await setDoc(doc(db, "users", user.uid), {
        plan: planId,
        updatedAt: new Date(),
      }, { merge: true });

      toast({
        title: "Plano selecionado!",
        description: `Você escolheu o plano ${getPlanInfo(planId)?.title}.`,
      });

  // Redirecionar para o Briefing antes da criação
  navigate("/briefing");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua escolha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Escolha Seu Plano</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transforme suas histórias em músicas incríveis. Escolha o plano ideal para você.
          </p>
        </div>

        {/* Plans Grid */}
    <div className="grid md:grid-cols-3 gap-8 mb-12 items-stretch">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
      className={`relative h-full flex flex-col ${plan.id === "basic" ? "ring-2 ring-primary shadow-lg" : ""}`}
            >
              {plan.id === "basic" && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                  Mais Popular
                </Badge>
              )}

              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-2xl">{plan.title}</CardTitle>
                <CardDescription className="text-3xl font-bold text-primary mt-2">
                  {plan.price}
                </CardDescription>
              </CardHeader>

              <CardContent className="mt-auto">
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div>
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full"
                    variant={plan.id === "basic" ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            💡 Todos os planos incluem entrega por WhatsApp e suporte técnico
          </p>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Planos;
