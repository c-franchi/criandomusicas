export function giftShareLinks(input: string, title: string) {
  const url = new URL(input);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !/^\/presente\/[a-f0-9]{64}$/.test(url.pathname)
  )
    throw Error("gift_invalid_token");
  url.search = "";
  url.hash = "";
  const link = url.toString(),
    encoded = encodeURIComponent(link),
    text = encodeURIComponent(title);
  return {
    url: link,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + " " + link)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    telegram: `https://t.me/share/url?url=${encoded}&text=${text}`,
    x: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
    email: `mailto:?subject=${text}&body=${encoded}`,
  };
}
