import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GiftArtwork from './GiftArtwork';
import { giftProducts } from './products';
import './gifts.css';

export default function MusicalGiftsSection() {
  const { t } = useTranslation('home');
  useEffect(() => {
    if (window.location.hash === '#presentes-musicais') {
      document.getElementById('presentes-musicais')?.scrollIntoView();
    }
  }, []);
  return (
    <section id="presentes-musicais" aria-labelledby="musical-gifts-title" className="scroll-mt-8 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Gift className="h-4 w-4" />{t('gifts.label')}</p>
          <h2 id="musical-gifts-title" className="text-3xl font-bold leading-tight sm:text-4xl">{t('gifts.title')}</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{t('gifts.description')}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {giftProducts.map(({ id, path }) => (
            <article key={id} className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl">
              <Link to={path} aria-label={t(`gifts.products.${id}.name`)} tabIndex={-1} className="block"><GiftArtwork product={id} /></Link>
              <div className="flex flex-1 flex-col p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{t(`gifts.products.${id}.name`)}</p>
                <h3 className="mb-3 text-xl font-semibold leading-snug">{t(`gifts.products.${id}.cardTitle`)}</h3>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t(`gifts.products.${id}.description`)}</p>
                <Button asChild variant="outline" className="mt-auto h-auto min-h-12 whitespace-normal py-3 text-left"><Link to={path}>{t(`gifts.products.${id}.cta`)}<ArrowUpRight className="ml-auto shrink-0" /></Link></Button>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{t('gifts.previewNotice')}</p>
      </div>
    </section>
  );
}
