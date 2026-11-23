export type ItalyPaymentStatus = "creating" | "open" | "paid" | "failed" | "expired";

export interface ItalyPayment {
  id: string;
  order_id: string;
  user_id: string;
  plan_id: string;
  price_id: string;
  amount_cents: number;
  currency: string;
  session_id: string | null;
  status: ItalyPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItalySaleOrder {
  id: string;
  song_title: string | null;
  music_style: string | null;
  language: string | null;
  status: string;
  payment_status: string;
}

export interface ItalySaleProfile {
  user_id: string;
  name: string | null;
}

export interface ItalySaleRow extends ItalyPayment {
  order: ItalySaleOrder | null;
  profile: ItalySaleProfile | null;
}

export type ItalySalesFilter = "all" | "paid" | "awaiting" | "failed" | "expired";

export function summarizeItalySales(rows: ItalyPayment[]) {
  return rows.reduce((summary, row) => {
    if (row.status === "paid") {
      summary.paidRevenueCents += row.amount_cents;
      summary.paidCount += 1;
    } else if (row.status === "creating" || row.status === "open") {
      summary.awaitingCount += 1;
    } else if (row.status === "failed" || row.status === "expired") {
      summary.closedWithoutPaymentCount += 1;
    }
    return summary;
  }, { paidRevenueCents: 0, paidCount: 0, awaitingCount: 0, closedWithoutPaymentCount: 0 });
}

export function filterItalySales(rows: ItalySaleRow[], filter: ItalySalesFilter, search: string) {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  return rows.filter((row) => {
    const matchesFilter = filter === "all"
      || row.status === filter
      || (filter === "awaiting" && (row.status === "creating" || row.status === "open"));
    if (!matchesFilter) return false;
    if (!term) return true;
    return [
      row.id,
      row.order_id,
      row.user_id,
      row.session_id,
      row.profile?.name,
      row.order?.song_title,
      row.order?.music_style,
      row.order?.language,
    ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
  });
}

export function formatItalyEur(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function italyPaymentStatusLabel(status: ItalyPaymentStatus) {
  const labels: Record<ItalyPaymentStatus, string> = {
    creating: "Criando checkout",
    open: "Aguardando pagamento",
    paid: "Pago · webhook",
    failed: "Pagamento falhou",
    expired: "Checkout expirado",
  };
  return labels[status];
}
