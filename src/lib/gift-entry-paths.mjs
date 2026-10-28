export const giftEntries = {
  digital: '/presente-digital.html',
  short: '/presente-curto.html',
  physical: '/presente-imprimir.html',
};
export const isPublicGiftPath = path => path.startsWith('/presente/') || path === '/presente.html' || Object.values(giftEntries).includes(path);
