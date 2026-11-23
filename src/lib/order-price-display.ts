import liveCatalog from "../../docs/stripe-italy-live-catalog.json" with { type: "json" };

const fullEur = liveCatalog.products.find((p) => p.plan_id === "music_full")?.unit_amount ?? null;

/** Italian visitors pay music orders with the live EUR catalog; others keep the stored BRL amount. */
export function formatOrderAmount(brlCents: number, language: string): string {
  if (language.toLowerCase().startsWith("it") && fullEur !== null) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(fullEur / 100);
  }
  return `R$ ${(brlCents / 100).toFixed(2).replace(".", ",")}`;
}

const speechLocales: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", it: "it-IT" };
export function speechLocale(language: string): string {
  return speechLocales[language.toLowerCase().slice(0, 2)] ?? "pt-BR";
}
