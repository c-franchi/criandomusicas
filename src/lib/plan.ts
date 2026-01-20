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
    price: "R$ 47,90",
    pricePromo: "R$ 19,90",
    limitSec: 180,
    features: ["1 música completa", "2 letras personalizadas para escolher", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte prioritário"],
    cta: "Criar Música"
  },
  {
    id: "package",
    title: "Pacote 3 Músicas",
    price: "R$ 99,90",
    limitSec: 180,
    features: ["Até 3 músicas completas", "2 letras personalizadas cada", "Letra + áudio profissional", "Alta qualidade", "Entrega por WhatsApp", "Suporte VIP"],
    cta: "Pacote Popular"
  },
  {
    id: "subscription",
    title: "Pacote 5 Músicas",
    price: "R$ 109,90",
    limitSec: 300,
    features: ["Até 5 músicas completas", "2 letras personalizadas cada", "Letra + áudio profissional", "Qualidade premium", "Entrega por WhatsApp", "Suporte 24/7", "Prioridade na fila"],
    cta: "Melhor Valor"
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
