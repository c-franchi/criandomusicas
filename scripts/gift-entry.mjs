import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {giftEntries} from '../src/lib/gift-entry-paths.mjs';
const copy = {
 digital: ['Um presente musical feito para você! | Criando Músicas', 'Pegue seus fones e prepare o coração. Uma música e uma mensagem especial estão esperando por você.'],
 short: ['Uma pequena canção. Uma grande surpresa! | Criando Músicas', 'Alguém transformou carinho em música para você. Abra seu presente e dê o play nessa lembrança especial.'],
 physical: ['Um cartão para guardar. Uma música para sentir. | Criando Músicas', 'Seu cartão guarda uma surpresa musical. Abra o link para ouvir a música e descobrir a mensagem feita para você.'],
};
export function giftEntryHtml(source, product = 'digital') {
 const [title,description]=copy[product] || copy.digital;
 const image=`https://criandomusicas.com.br/social/gift-${product in copy ? product : 'digital'}-v2.png`;
 let html=source.replace(/<title>[^<]*<\/title>/,`<title>${title}</title>`);
 // One authoritative set of static tags for crawlers. No cookie dialog screenshots,
 // private names, photos, lyrics or canonical URL that strips the capability query.
 html=html.replace(/<meta\s+(?:name|property)="(?:description|robots|googlebot|referrer|og:[^"]+|twitter:[^"]+)"[^>]*>/g,'');
 html=html.replace(/<link[^>]*rel="canonical"[^>]*>/g,'');
 const meta={description,robots:'noindex, nofollow',googlebot:'noindex, nofollow',referrer:'no-referrer','og:type':'website','og:site_name':'Criando Músicas','og:title':title,'og:description':description,'og:image':image,'og:image:secure_url':image,'og:image:type':'image/png','og:image:width':'1200','og:image:height':'630','og:image:alt':title,'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image};
 return html.replace('</head>',Object.entries(meta).map(([k,v])=>`<meta ${k.startsWith('og:')?'property':'name'}="${k}" content="${v}" />`).join('\n')+'\n</head>');
}
export function writeGiftEntry(directory) {
 const source=readFileSync(join(directory,'index.html'),'utf8');
 writeFileSync(join(directory,'presente.html'),giftEntryHtml(source));
 for(const [product,path] of Object.entries(giftEntries)) writeFileSync(join(directory,path.slice(1)),giftEntryHtml(source,product));
 const entry=source.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
 if(!entry) throw Error('Missing built module entry');
 writeFileSync(join(directory,'app-version.json'),JSON.stringify({entry}));
}
