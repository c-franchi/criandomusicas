import { resolveGenerationLanguage, type GenerationLanguage } from '../../supabase/functions/_shared/generationLanguage.ts';

export interface OrderLike {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  song_title?: string | null;
  language?: string | null;
}

export interface NextStep {
  url: string;
  label: string;
  description: string;
  /** true when the user still has an action to perform */
  actionable: boolean;
}

const nextStepCopies: Record<GenerationLanguage, Record<string, { label: string; description: string }>> = {
  'pt-BR': {
    payment: { label: 'Continuar pagamento', description: 'Seu pedido está aguardando o pagamento para começarmos.' },
    pix: { label: 'Enviar comprovante PIX', description: 'Envie o comprovante para confirmarmos seu pagamento.' },
    lyrics: { label: 'Escolher a letra', description: 'Suas letras estão prontas! Escolha a sua favorita.' },
    pending: { label: 'Acompanhar pedido', description: 'Estamos preparando as letras da sua música.' },
    generating: { label: 'Acompanhar criação', description: 'Sua música está sendo criada.' },
    ready: { label: 'Ouvir minha música', description: 'Sua música está pronta!' },
    default: { label: 'Ver pedido', description: 'Continue de onde parou.' },
  },
  en: {
    payment: { label: 'Continue payment', description: 'Your order is waiting for payment so we can begin.' },
    pix: { label: 'Send PIX receipt', description: 'Send the receipt so we can confirm your payment.' },
    lyrics: { label: 'Choose the lyrics', description: 'Your lyrics are ready! Choose your favorite.' },
    pending: { label: 'Track order', description: 'We are preparing your song lyrics.' },
    generating: { label: 'Track creation', description: 'Your music is being created.' },
    ready: { label: 'Listen to my music', description: 'Your music is ready!' },
    default: { label: 'View order', description: 'Continue where you left off.' },
  },
  es: {
    payment: { label: 'Continuar pago', description: 'Tu pedido está esperando el pago para comenzar.' },
    pix: { label: 'Enviar comprobante PIX', description: 'Envía el comprobante para confirmar tu pago.' },
    lyrics: { label: 'Elegir la letra', description: '¡Tus letras están listas! Elige tu favorita.' },
    pending: { label: 'Seguir pedido', description: 'Estamos preparando las letras de tu canción.' },
    generating: { label: 'Seguir creación', description: 'Tu música se está creando.' },
    ready: { label: 'Escuchar mi música', description: '¡Tu música está lista!' },
    default: { label: 'Ver pedido', description: 'Continúa donde lo dejaste.' },
  },
  it: {
    payment: { label: 'Continua il pagamento', description: 'Il tuo ordine è in attesa del pagamento per iniziare.' },
    pix: { label: 'Invia la ricevuta PIX', description: 'Invia la ricevuta per confermare il pagamento.' },
    lyrics: { label: 'Scegli il testo', description: 'I tuoi testi sono pronti! Scegli il tuo preferito.' },
    pending: { label: 'Segui l’ordine', description: 'Stiamo preparando il testo della tua canzone.' },
    generating: { label: 'Segui la creazione', description: 'La tua musica è in creazione.' },
    ready: { label: 'Ascolta la mia musica', description: 'La tua musica è pronta!' },
    default: { label: 'Vedi l’ordine', description: 'Continua da dove eri rimasto.' },
  },
};

/** Central mapping between an order state and its localized continuation screen. */
export const getNextStep = (order: OrderLike): NextStep => {
  const status = order.status || '';
  const payment = order.payment_status || '';
  const copy = nextStepCopies[resolveGenerationLanguage(order.language)];

  let key = 'default';
  let url = `/pedido/${order.id}`;
  let actionable = false;
  if (status === 'AWAITING_PAYMENT' && payment !== 'AWAITING_PIX') {
    key = 'payment'; url = `/checkout/${order.id}`; actionable = true;
  } else if (payment === 'AWAITING_PIX' || status === 'AWAITING_PIX') {
    key = 'pix'; url = `/checkout/${order.id}`; actionable = true;
  } else if (status === 'LYRICS_GENERATED') {
    key = 'lyrics'; url = `/pedido/${order.id}/letras`; actionable = true;
  } else if (['PAID', 'BRIEFING_COMPLETE', 'LYRICS_PENDING'].includes(status)) {
    key = 'pending'; url = `/acompanhar/${order.id}`; actionable = true;
  } else if (['LYRICS_APPROVED', 'MUSIC_GENERATING'].includes(status)) {
    key = 'generating'; url = `/acompanhar/${order.id}`;
  } else if (['MUSIC_READY', 'COMPLETED'].includes(status)) {
    key = 'ready'; actionable = true;
  }
  return { url, ...copy[key], actionable };
};
