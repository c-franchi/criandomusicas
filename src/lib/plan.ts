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
// IMPORTANT: These values MUST match the database pricing_config table and Stripe prices!
// Single: R$ 9,90 | Package: R$ 24,90 | 5-Pack: R$ 39,90
// UNIVERSAL CREDITS: All plans can be used for vocal, instrumental, or custom lyrics
export const PLANS: PlanInfo[] = [
  {
    id: "single",
    title: "1 Crédito",
    price: "R$ 9,90",
    limitSec: 180,
    features: ["1 crédito universal", "Use para vocal, instrumental ou letra própria", "Alta qualidade", "Entrega em até 48h"],
    cta: "Comprar"
  },
  {
    id: "package",
    title: "3 Créditos",
    price: "R$ 24,90",
    limitSec: 180,
    features: ["3 créditos universais", "Use para qualquer tipo de música", "Economia de 16%", "Entrega em até 48h", "Suporte VIP"],
    cta: "Pacote Popular"
  },
  {
    id: "subscription",
    title: "5 Créditos",
    price: "R$ 39,90",
    limitSec: 300,
    features: ["5 créditos universais", "Melhor custo-benefício", "Entrega em até 48h", "Prioridade na fila"],
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
