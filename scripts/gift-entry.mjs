import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
export function giftEntryHtml(source) {
  const title='Uma surpresa musical espera por você! 🎁 | Criando Músicas';
  const description='Pegue seus fones, prepare o coração e abra seu presente. Uma música e uma mensagem especial estão esperando por você. 💜';
  let html=source.replace(/<title>[^<]*<\/title>/,`<title>${title}</title>`);
  const values={'description':description,'robots':'noindex, nofollow','googlebot':'noindex, nofollow','og:url':'https://criandomusicas.com.br/presente.html','og:title':title,'og:description':description,'twitter:title':title,'twitter:description':description};
  for(const [key,value] of Object.entries(values)) {
    html=html.replace(new RegExp(`<meta (?:name|property)="${key}"[^>]*>`,'g'),tag=>tag.replace(/content="[^"]*"/,`content="${value}"`));
  }
  // A real static head for crawlers; never embed names, tokens, photos or lyrics.
  html=html.replace(/<meta property="og:url"[^>]*>/g,'');
  return html.replace('</head>',`<meta name="referrer" content="no-referrer" />\n<meta property="og:image" content="https://criandomusicas.com.br/icons/icon-512x512.png" />\n<meta name="twitter:image" content="https://criandomusicas.com.br/icons/icon-512x512.png" />\n</head>`);
}
export function writeGiftEntry(directory) {
  writeFileSync(join(directory,'presente.html'),giftEntryHtml(readFileSync(join(directory,'index.html'),'utf8')));
}
