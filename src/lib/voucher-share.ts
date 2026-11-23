// Voucher share copy per market: Brazil shares in Portuguese with the .com.br site,
// Italy in Italian with creandomusica.it. Only percent vouchers valid for music work in euro.
export type ShareMarket = 'BR' | 'IT';
export interface ShareVoucher {
  code: string; discount_type: string; discount_value: number; valid_until: string | null; plan_ids: string[] | null;
}
export const MARKET_SITE: Record<ShareMarket, string> = { BR: 'https://criandomusicas.com.br', IT: 'https://creandomusica.it' };

const PLAN_LABELS: Record<ShareMarket, Record<string, string>> = {
  BR: { single: '1 Crédito Universal + cartões', package: 'Pacote 3 Músicas', subscription: 'Pacote 5 Músicas', single_custom_lyric: 'Letra Própria', creator_start: 'Creator Start', creator_pro: 'Creator Pro', creator_studio: 'Creator Studio' },
  IT: { single: 'Canzone personalizzata' },
};

export function canShareInMarket(v: ShareVoucher, market: ShareMarket): boolean {
  if (market === 'BR') return true;
  return v.discount_type === 'percent' && (!v.plan_ids || v.plan_ids.length === 0 || v.plan_ids.includes('single'));
}

function joinList(items: string[], and: string) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}
function planText(v: ShareVoucher, m: ShareMarket) {
  if (m === 'IT') return PLAN_LABELS.IT.single;
  if (!v.plan_ids || v.plan_ids.length === 0) return 'Todos os planos';
  return joinList(v.plan_ids.map(id => PLAN_LABELS.BR[id] || id), 'e');
}
function dateText(iso: string, m: ShareMarket) {
  return new Intl.DateTimeFormat(m === 'IT' ? 'it-IT' : 'pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}
export function voucherShareUrl(v: ShareVoucher, m: ShareMarket) {
  return `${MARKET_SITE[m]}?voucher=${encodeURIComponent(v.code)}`;
}
export function voucherShareText(v: ShareVoucher, m: ShareMarket): string {
  if (m === 'IT') {
    const expiry = v.valid_until ? `\nValido fino al: ${dateText(v.valid_until, m)}` : '';
    return `🎵 CODICE SCONTO 🎵\n\nUsa il codice: *${v.code}*\nSconto: ${v.discount_value}%\nValido per: ${planText(v, m)}${expiry}\n\n🎶 Crea la tua canzone personalizzata su:\n${MARKET_SITE.IT}`;
  }
  const discount = v.discount_type === 'percent' ? `${v.discount_value}% de desconto` : `R$ ${(v.discount_value / 100).toFixed(2).replace('.', ',')} de desconto`;
  const expiry = v.valid_until ? `\nVálido até: ${dateText(v.valid_until, m)}` : '';
  return `🎵 CUPOM DE DESCONTO 🎵\n\nUse o código: *${v.code}*\nDesconto: ${discount}\nVálido para: ${planText(v, m)}${expiry}\n\n🎶 Crie sua música personalizada em:\n${MARKET_SITE.BR}`;
}
export function voucherShortText(v: ShareVoucher, m: ShareMarket): string {
  if (m === 'IT') return `🎵 Usa il codice ${v.code} e ottieni il ${v.discount_value}% di sconto sulla tua canzone personalizzata! 🎶`;
  const plans = v.plan_ids && v.plan_ids.length > 0 ? ` para ${planText(v, m)}` : '';
  return `🎵 Use o cupom ${v.code} e ganhe desconto${plans} na sua música personalizada! 🎶`;
}
