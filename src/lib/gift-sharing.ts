import { isGiftToken } from './gift-link.ts';
export function giftShareLinks(input: string, title: string, message = title) {
  const url = new URL(input);
  const para = url.searchParams.get('para');
  const friendlyGift = url.pathname === '/presente.html' && !!para && isGiftToken('para-'+para);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    (!friendlyGift && !(url.pathname.startsWith('/presente/') && isGiftToken(url.pathname.slice('/presente/'.length)))) || url.username || url.password
  )
    throw Error("gift_invalid_token");
  url.search = friendlyGift ? new URLSearchParams({para:para!}).toString() : '';
  url.hash = '';
  const link = url.toString(),
    encoded = encodeURIComponent(link),
    text = encodeURIComponent(message);
  return {
    url: link,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message + "\n\n" + link)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    telegram: `https://t.me/share/url?url=${encoded}&text=${text}`,
    x: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message+'\n\n'+link)}`,
  };
}
