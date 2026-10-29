export const backgroundDesigns = ['hearts', 'flowers', 'celebration', 'classic'] as const;
export const backgroundPalettes = ['rose', 'blue', 'gold', 'christmas'] as const;
export type BackgroundDesign = typeof backgroundDesigns[number];
export type BackgroundPalette = typeof backgroundPalettes[number];
const palettes = { rose: ['#db6ba7', '#a78bfa'], blue: ['#64b5d9', '#a5b4fc'], gold: ['#cc9d47', '#d5b1d7'], christmas: ['#57a58a', '#d77c8c'] };

/** Decorative border artwork: transparent center, no portraits, names, text or QR. */
export function giftBackgroundSvg(design: BackgroundDesign, palette: BackgroundPalette) {
  const [a,b] = palettes[palette] || palettes.rose;
  const hearts = [[55,75,1],[640,150,.65],[80,820,.6],[610,870,1]].map(([x,y,s])=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 12C-40-20-55 28 0 65C55 28 40-20 0 12Z" fill="${a}" opacity=".48"/>`).join('');
  const flowers = [[55,65],[660,105],[45,865],[650,900]].map(([x,y])=>`<g transform="translate(${x} ${y})" opacity=".6">${[0,60,120,180,240,300].map(r=>`<ellipse cy="-25" rx="14" ry="29" fill="${r%120?a:b}" transform="rotate(${r})"/>`).join('')}<circle r="13" fill="${a}"/></g>`).join('');
  const confetti = Array.from({length:38},(_,i)=>{const x=i%2?665-(i*13%58):20+(i*17%65);const y=25+(i*73%910);return `<circle cx="${x}" cy="${y}" r="${i%3+2}" fill="${i%2?a:b}" opacity=".65"/>`;}).join('');
  const classic=`<rect x="28" y="28" width="664" height="904" rx="34" fill="none" stroke="${a}" stroke-width="2" opacity=".55"/><path d="M28 132V62Q28 28 62 28H132M588 932H658Q692 932 692 898V828" fill="none" stroke="${b}" stroke-width="6" opacity=".6"/>`;
  const art = design==='hearts'?hearts:design==='flowers'?flowers:design==='celebration'?confetti:classic;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960"><defs><radialGradient id="wash"><stop stop-color="${b}" stop-opacity=".24"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient></defs><ellipse cx="0" cy="0" rx="220" ry="260" fill="url(#wash)"/><ellipse cx="720" cy="960" rx="220" ry="260" fill="url(#wash)"/>${art}</svg>`;
}
export const backgroundPreviewUrl = (design: BackgroundDesign, palette: BackgroundPalette) => `data:image/svg+xml,${encodeURIComponent(giftBackgroundSvg(design,palette))}`;

/** Produce a real, transparent PNG accepted by the existing background gallery. */
export async function renderGiftBackground(design: BackgroundDesign, palette: BackgroundPalette): Promise<string> {
  const image = new Image();
  await new Promise<void>((resolve,reject)=>{
    const timeout=setTimeout(()=>{image.onload=null;image.onerror=null;reject(Error('background_timeout'));},8000);
    image.onload=()=>{clearTimeout(timeout);resolve();};
    image.onerror=()=>{clearTimeout(timeout);reject(Error('background_render_failed'));};
    image.src=backgroundPreviewUrl(design,palette);
  });
  for(const width of [720,540,360]) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(width*4/3);
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('background_render_failed');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/png');if(data.length<=230000)return data;
  }
  throw Error('background_too_large');
}
