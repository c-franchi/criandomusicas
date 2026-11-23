import liveCatalog from "../../docs/stripe-italy-live-catalog.json" with { type: "json" };

const eur = (id: string) => liveCatalog.products.find((p) => p.plan_id === id)?.unit_amount ?? null;
const fullEur = eur("music_full");
const packageEur = eur("music_package_3");

/** EUR price charged for an order's plan in Italy (3-song packages use the package price). */
export function euroAmountForPlan(planId?: string | null): number {
  if ((planId === "package" || planId === "package_instrumental") && packageEur !== null) return packageEur;
  return fullEur ?? 0;
}

/** Italian visitors pay music orders with the live EUR catalog; others keep the stored BRL amount. */
export function formatOrderAmount(brlCents: number, language: string, planId?: string | null): string {
  if (language.toLowerCase().startsWith("it") && fullEur !== null) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(euroAmountForPlan(planId) / 100);
  }
  return `R$ ${(brlCents / 100).toFixed(2).replace(".", ",")}`;
}

const speechLocales: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", it: "it-IT" };
export function speechLocale(language: string): string {
  return speechLocales[language.toLowerCase().slice(0, 2)] ?? "pt-BR";
}
