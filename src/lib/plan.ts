export type Plan = "single" | "package" | "subscription";

export interface PlanInfo {
  id: Plan;
  title: string;
  price: string;
  pricePromo?: string;
  features: string[];
  cta: string;
  limitSec: number;
  isSubscription?: boolean;
}

// Static fallback plans (used when DB is not available)
export const PLANS: PlanInfo[] = [
  {
    id: "single",
    title: "Música Única",
    price: "R$ 29,90",
    pricePromo: "R$ 9,90",
    limitSec: 180,
    features: ["1 música completa", "2 letras personalizadas para escolher", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte prioritário"],
    cta: "Criar Música"
  },
  {
    id: "package",
    title: "Pacote 3 Músicas",
    price: "R$ 49,90",
    limitSec: 180,
    features: ["3 músicas completas", "2 letras personalizadas cada", "Economia de 16%", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte VIP"],
    cta: "Pacote Popular"
  },
  {
    id: "subscription",
    title: "Assinatura Mensal",
    price: "R$ 69,90",
    limitSec: 300,
    isSubscription: true,
    features: ["Até 5 músicas por mês", "2 letras personalizadas cada", "Letra + áudio profissional", "Qualidade premium", "Entrega instantânea", "Suporte 24/7", "Acesso antecipado", "Cancelamento a qualquer momento"],
    cta: "Assinar Agora"
  },
];

export const getPlanInfo = (planId: Plan): PlanInfo | undefined => {
  return PLANS.find(plan => plan.id === planId);
};

export const canGenerateMoreMusic = (currentPlan: Plan, generatedCount: number): boolean => {
  switch (currentPlan) {
    case "single":
      return generatedCount < 1;
    case "package":
      return generatedCount < 3;
    case "subscription":
      return generatedCount < 5;
    default:
      return false;
  }
};