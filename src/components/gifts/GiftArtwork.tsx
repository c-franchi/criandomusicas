import { Gift, Heart, Music2, Play, QrCode, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GiftProduct } from './products';

/** Code-native illustrations: no real recipient, audio, or printable QR is implied. */
export default function GiftArtwork({ product }: { product: GiftProduct }) {
  const { t } = useTranslation('home');
  return (
    <div aria-hidden="true" className={`gift-artwork gift-artwork-${product}`}>
      <div className="absolute h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
      {product === 'digital' ? (
        <div className="gift-phone relative w-40 rounded-[2rem] border-[5px] border-white/80 bg-slate-950 p-4 text-center text-white shadow-2xl sm:w-44">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/30" />
          <Heart className="mx-auto mb-3 h-9 w-9 text-pink-300" strokeWidth={1.25} />
          <p className="mb-3 text-[10px] uppercase tracking-[.14em] text-pink-200">{t('gifts.art.forYou')}</p>
          <p className="font-serif text-lg leading-snug">{t('gifts.art.song')}</p>
          <div className="mx-auto my-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-pink-400"><Play className="h-4 w-4 fill-current" /></div>
          <div className="flex items-end justify-center gap-1" >{[8, 14, 22, 12, 28, 18, 24, 10, 18].map((height, i) => <span key={i} className="w-1 rounded-full bg-pink-200/60" style={{ height }} />)}</div>
        </div>
      ) : product === 'short' ? (
        <div className="relative w-64 max-w-full rounded-3xl border border-white/25 bg-slate-950/85 p-6 text-white shadow-2xl">
          <div className="mb-6 flex items-center justify-between"><Music2 className="h-7 w-7 text-pink-300" /><span className="rounded-full bg-white/10 px-3 py-1 text-xs">15s / 30s</span></div>
          <div className="mb-6 flex h-16 items-center justify-center gap-1.5">{[12, 28, 42, 24, 56, 36, 64, 28, 48, 20, 36, 12].map((height, i) => <span key={i} className="w-2 rounded-full bg-gradient-to-t from-violet-500 to-pink-300" style={{ height }} />)}</div>
          <p className="font-serif text-2xl">{t('gifts.art.littleSong')}</p>
          <p className="mt-2 text-xs text-white/65">{t('gifts.art.bigFeeling')}</p>
        </div>
      ) : (
        <div className="relative flex w-64 max-w-full flex-col items-center rounded-xl border border-stone-200 bg-stone-50 p-6 text-center text-slate-800 shadow-2xl">
          <Gift className="mb-3 h-8 w-8 text-violet-600" strokeWidth={1.25} />
          <p className="text-[10px] uppercase tracking-[.14em] text-violet-700">Criando Músicas</p>
          <p className="my-3 font-serif text-2xl">{t('gifts.art.keep')}</p>
          <div className="flex items-center gap-3 border-t border-stone-200 pt-3"><QrCode className="h-8 w-8 text-slate-700" /><p className="max-w-28 text-left text-[10px]">{t('gifts.art.qrIllustration')}</p></div>
        </div>
      )}
      <Sparkles className="absolute right-[12%] top-[17%] h-6 w-6 text-primary/50" />
    </div>
  );
}
