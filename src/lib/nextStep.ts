export interface OrderLike {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  song_title?: string | null;
}

export interface NextStep {
  url: string;
  label: string;
  description: string;
  /** true when the user still has an action to perform */
  actionable: boolean;
}

/**
 * Central mapping between an order state and the next screen the user
 * should go to in order to continue the flow.
 */
export const getNextStep = (order: OrderLike): NextStep => {
  const status = order.status || '';
  const payment = order.payment_status || '';

  if (status === 'AWAITING_PAYMENT' && payment !== 'AWAITING_PIX') {
    return {
      url: `/checkout/${order.id}`,
      label: 'Continuar pagamento',
      description: 'Seu pedido está aguardando o pagamento para começarmos.',
      actionable: true,
    };
  }

  if (payment === 'AWAITING_PIX' || status === 'AWAITING_PIX') {
    return {
      url: `/checkout/${order.id}`,
      label: 'Enviar comprovante PIX',
      description: 'Envie o comprovante para confirmarmos seu pagamento.',
      actionable: true,
    };
  }

  if (status === 'LYRICS_GENERATED') {
    return {
      url: `/pedido/${order.id}/letras`,
      label: 'Escolher a letra',
      description: 'Suas letras estão prontas! Escolha a sua favorita.',
      actionable: true,
    };
  }

  if (['PAID', 'BRIEFING_COMPLETE', 'LYRICS_PENDING'].includes(status)) {
    return {
      url: `/acompanhar/${order.id}`,
      label: 'Acompanhar pedido',
      description: 'Estamos preparando as letras da sua música.',
      actionable: true,
    };
  }

  if (['LYRICS_APPROVED', 'MUSIC_GENERATING'].includes(status)) {
    return {
      url: `/acompanhar/${order.id}`,
      label: 'Acompanhar criação',
      description: 'Sua música está sendo criada.',
      actionable: false,
    };
  }

  if (['MUSIC_READY', 'COMPLETED'].includes(status)) {
    return {
      url: `/pedido/${order.id}`,
      label: 'Ouvir minha música',
      description: 'Sua música está pronta!',
      actionable: true,
    };
  }

  return {
    url: `/pedido/${order.id}`,
    label: 'Ver pedido',
    description: 'Continue de onde parou.',
    actionable: false,
  };
};
