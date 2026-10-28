import { isGiftToken } from './gift-link.ts';
import { isPublicGiftPath } from './gift-entry-paths.mjs';
export function giftShareLinks(input: string, title: string, message = title) {
  const url = new URL(input);
  const currentPreview = url.searchParams.get('v') === '2';
  const hashKey = isPublicGiftPath(url.pathname) && url.pathname.endsWith('.html') && isGiftToken(url.hash.slice(1)) ? url.hash.slice(1) : '';
  const para = url.searchParams.get('para') || (hashKey.startsWith('para-') ? hashKey.slice(5) : null);
  const token = url.searchParams.get('token') || (hashKey && !hashKey.startsWith('para-') ? hashKey : null);
  const legacyEntry = isPublicGiftPath(url.pathname) && url.pathname.endsWith('.html') && !!token && /^[a-f0-9]{64}$/.test(token);
  const friendlyGift = isPublicGiftPath(url.pathname) && url.pathname.endsWith('.html') && !!para && isGiftToken('para-'+para);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    (!friendlyGift && !legacyEntry && !(url.pathname.startsWith('/presente/') && isGiftToken(url.pathname.slice('/presente/'.length)))) || url.username || url.password
  )
    throw Error("gift_invalid_token");
  if (url.pathname.startsWith('/presente/')) {
    const key = url.pathname.slice('/presente/'.length);
    url.pathname = '/presente.html';
    url.search = key.startsWith('para-') ? new URLSearchParams({para:key.slice(5)}).toString() : new URLSearchParams({token:key}).toString();
  } else {
    url.search = friendlyGift && para ? new URLSearchParams({para}).toString() : legacyEntry && token ? new URLSearchParams({token}).toString() : '';
  }
  if(currentPreview) url.searchParams.set('v','2');
  url.hash = '';
  const link = url.toString(),
    encoded = encodeURIComponent(link),
    text = encodeURIComponent(message);
  const shareText = message + "\n\n" + link;
  return {
    url: link,
    shareText,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    telegram: `https://t.me/share/url?url=${encoded}&text=${text}`,
    x: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`,
  };
}
