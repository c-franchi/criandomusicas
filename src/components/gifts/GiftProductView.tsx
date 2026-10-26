import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Gift, Heart, Music2, RotateCcw } from 'lucide-react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import GiftArtwork from '@/components/gifts/GiftArtwork';
import { giftProducts, type GiftProduct } from '@/components/gifts/products';
import '@/components/gifts/gifts.css';

const themes = ['christmas', 'love', 'birthday', 'family', 'birth', 'friendship', 'gratitude', 'tribute', 'wedding', 'any'] as const;

function GiftProductContent({ product }: { product: GiftProduct }) {
  const { t } = useTranslation('home');
  const [theme, setTheme] = useState<typeof themes[number]>('love');
  const [revealed, setRevealed] = useState(false);
  const [duration, setDuration] = useState<15 | 30>(30);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const key = `gifts.products.${product}`;
  const items = t(`${key}.included`, { returnObjects: true }) as string[];
  const steps = t(`${key}.steps`, { returnObjects: true }) as string[];
  const occasions = t(`${key}.occasions`, { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title={t(`${key}.name`)} description={t(`${key}.description`)} noIndex />
      <main>
        <div className="mx-auto max-w-6xl px-5 pt-6"><Link to="/#presentes-musicais" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />{t('gifts.back')}</Link></div>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-2 md:py-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Gift className="h-4 w-4" />{t(`${key}.name`)}</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{t(`${key}.headline`)}</h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">{t(`${key}.description`)}</p>
            <Button asChild variant="hero" size="lg" className="mt-7 h-auto min-h-12 whitespace-normal py-4"><a href="#experiencia">{t(product === 'short' ? 'gifts.exploreDuration' : 'gifts.exploreModels')}<ArrowRight className="h-4 w-4" /></a></Button>
            <p className="mt-4 max-w-lg text-xs leading-relaxed text-muted-foreground">{t('gifts.previewNotice')}</p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-border"><GiftArtwork product={product} /></div>
        </section>

        {product === 'digital' && (
          <section aria-labelledby="gift-modalities-title" className="mx-auto max-w-6xl px-5 pb-16">
            <h2 id="gift-modalities-title" className="mb-6 text-2xl font-semibold">{t('gifts.modalities.title')}</h2>
            <div className="grid gap-5 sm:grid-cols-2">{['existing', 'new'].map(mode => <article key={mode} className="rounded-2xl border border-border bg-card p-6"><Music2 className="mb-4 h-6 w-6 text-primary" /><h3 className="text-xl font-semibold">{t(`gifts.modalities.${mode}.title`)}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(`gifts.modalities.${mode}.description`)}</p></article>)}</div>
          </section>
        )}

        <section id="experiencia" aria-labelledby="gift-experience-title" className="gift-theme scroll-mt-24 border-y border-border/50 px-5 py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold text-primary">{t('gifts.demoLabel')}</p>
              <h2 id="gift-experience-title" className="text-2xl font-bold sm:text-3xl">{t(`${key}.experienceTitle`)}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t(`${key}.experienceDescription`)}</p>
              {product === 'short' ? (
                <fieldset className="mt-6"><legend className="mb-3 text-sm font-medium">{t('gifts.durationLabel')}</legend><div className="flex flex-wrap gap-3">{([15, 30] as const).map(seconds => <Button key={seconds} variant={duration === seconds ? 'default' : 'outline'} aria-pressed={duration === seconds} onClick={() => setDuration(seconds)} className="min-h-12">{t('gifts.upTo', { seconds })}</Button>)}</div><p className="mt-3 text-xs text-muted-foreground">{t('gifts.durationNote')}</p></fieldset>
              ) : (
                <fieldset className="mt-6"><legend className="mb-3 text-sm font-medium">{t('gifts.themeLabel')}</legend><div className="flex flex-wrap gap-2">{themes.map(id => <Button key={id} variant={theme === id ? 'default' : 'outline'} aria-pressed={theme === id} onClick={() => { setTheme(id); setRevealed(false); }} className="h-auto min-h-11 whitespace-normal px-3 py-2 text-xs">{t(`gifts.themes.${id}`)}</Button>)}</div></fieldset>
              )}
            </div>
            <div className="mx-auto w-full max-w-md rounded-3xl border border-primary/20 bg-card p-7 text-center shadow-xl sm:p-10" aria-live="polite">
              <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-primary">{product === 'short' ? t('gifts.upTo', { seconds: duration }) : t(`gifts.themes.${theme}`)}</p>
              {product === 'short' ? <Music2 className="mx-auto mb-5 h-12 w-12 text-primary" strokeWidth={1.25} /> : <Heart className="mx-auto mb-5 h-12 w-12 text-accent" strokeWidth={1.25} />}
              <h3 className="font-serif text-3xl leading-snug">{t(product === 'short' ? 'gifts.demo.shortTitle' : revealed ? 'gifts.demo.revealedTitle' : 'gifts.demo.title')}</h3>
              {revealed || product === 'short' ? <div className="gift-reveal"><p className="my-5 text-sm leading-relaxed text-muted-foreground">{t(product === 'short' ? 'gifts.demo.shortDescription' : 'gifts.demo.dedication')}</p><p className="text-xs text-muted-foreground">{t('gifts.demo.noAudio')}</p>{product !== 'short' && <Button variant="ghost" onClick={() => setRevealed(false)} className="mt-5 min-h-11"><RotateCcw className="h-4 w-4" />{t('gifts.demo.reset')}</Button>}</div> : <Button variant="hero" onClick={() => setRevealed(true)} className="mt-7 h-auto min-h-12 whitespace-normal py-3">{t('gifts.demo.reveal')}</Button>}
              <p className="mt-6 border-t border-border pt-4 text-[11px] text-muted-foreground">{t('gifts.demo.disclaimer')}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2">
          <div><h2 className="mb-6 text-2xl font-bold">{t('gifts.howItWorks')}</h2><ol className="space-y-5">{steps.map((step, index) => <li key={step} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span><p className="pt-1 text-sm leading-relaxed text-muted-foreground">{step}</p></li>)}</ol></div>
          <div><h2 className="mb-6 text-2xl font-bold">{t('gifts.included')}</h2><ul className="space-y-4">{items.map(item => <li key={item} className="flex gap-3 text-sm leading-relaxed"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul><div className="mt-7 rounded-2xl border border-border bg-card p-5"><p className="font-medium">{t('gifts.commercial.title')}</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`${key}.conditions`)}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('gifts.commercial.pending')}</p><Button disabled className="mt-4 min-h-12 w-full">{t('gifts.commercial.unavailable')}</Button></div></div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16"><h2 className="mb-6 text-2xl font-bold">{t('gifts.occasions')}</h2><ul className="flex flex-wrap gap-3">{occasions.map(occasion => <li key={occasion} className="rounded-full border border-border bg-card px-4 py-3 text-sm">{occasion}</li>)}</ul></section>
        <nav aria-label={t('gifts.otherProducts')} className="border-t border-border px-5 py-10"><div className="mx-auto flex max-w-6xl flex-wrap gap-3">{giftProducts.filter(item => item.id !== product).map(item => <Button key={item.id} asChild variant="outline" className="h-auto min-h-12 whitespace-normal py-3"><Link to={item.path}>{t(`gifts.products.${item.id}.name`)}<ArrowRight className="h-4 w-4" /></Link></Button>)}</div></nav>
      </main>
    </div>
  );
}

export default function GiftProductView({ product }: { product: GiftProduct }) {
  // Reset the presentation when navigating between products that share this lazy page.
  return <GiftProductContent key={product} product={product} />;
}
