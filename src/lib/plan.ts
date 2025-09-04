export type Plan = "free" | "basic" | "pro";

export interface PlanInfo {
  id: Plan;
  title: string;
  price: string;
  features: string[];
  cta: string;
  limitSec: number;
}

export const PLANS: PlanInfo[] = [
  {
    id: "free",
    title: "Free",
    price: "R$ 0",
    limitSec: 60,
    features: ["1 música", "2 letras para escolher", "Duração até 1 min", "Entrega por WhatsApp"],
    cta: "Usar grátis"
  },
  {
    id: "basic",
    title: "Básico",
    price: "R$ 29",
    limitSec: 180,
    features: ["3 músicas", "3 letras cada", "Duração até 3 min", "Entrega rápida", "Suporte prioritário"],
    cta: "Escolher Básico"
  },
  {
    id: "pro",
    title: "Pro",
    price: "R$ 79",
    limitSec: 300,
    features: ["10 músicas", "3 letras cada", "Duração até 5 min", "Prioridade máxima", "Suporte 24/7"],
    cta: "Escolher Pro"
  },
];

export const getPlanInfo = (planId: Plan): PlanInfo | undefined => {
  return PLANS.find(plan => plan.id === planId);
};

export const canGenerateMoreMusic = (currentPlan: Plan, generatedCount: number): boolean => {
  switch (currentPlan) {
    case "free":
      return generatedCount < 1;
    case "basic":
      return generatedCount < 3;
    case "pro":
      return generatedCount < 10;
    default:
      return false;
  }
};
