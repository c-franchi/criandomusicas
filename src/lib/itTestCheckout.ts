export function formatEurCents(cents: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

const labels: Record<string, string> = {
  pending: "Iniciando",
  open: "Aguardando pagamento (teste)",
  paid: "Pago em TESTE (confirmado pelo Stripe)",
  failed: "Falhou",
  expired: "Expirado",
  abandoned: "Cancelado",
};
export function itTestStatusLabel(status: string): string {
  return labels[status] ?? status;
}
