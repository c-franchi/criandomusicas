export const giftProducts = [
  { id: 'digital', path: '/cartao-digital' },
  { id: 'short', path: '/musicas-curtas' },
  { id: 'physical', path: '/cartao-fisico' },
] as const;

export type GiftProduct = typeof giftProducts[number]['id'];
