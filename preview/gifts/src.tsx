import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from 'next-themes';
import { useTranslation } from 'react-i18next';
import MusicalGiftsSection from '@/components/gifts/MusicalGiftsSection';
import GiftProductView from '@/components/gifts/GiftProductView';
import { giftProducts } from '@/components/gifts/products';
import '@/lib/i18n';
import '@/index.css';

export default function Preview() {
  const { t, i18n } = useTranslation('home');
  return (
    <>
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <Link to="/" className="font-bold gradient-text">Criando Músicas</Link>
          <nav aria-label={t('gifts.label')} className="flex flex-wrap gap-4 text-sm">{giftProducts.map(item => <Link key={item.id} to={item.path} className="py-2 hover:text-primary">{t(`gifts.products.${item.id}.name`)}</Link>)}</nav>
          <div className="flex gap-2">{['pt-BR', 'en', 'es', 'it'].map(lang => <button key={lang} onClick={() => i18n.changeLanguage(lang)} aria-pressed={i18n.language === lang} className="min-h-11 rounded-lg border border-border px-2 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground">{lang}</button>)}</div>
        </div>
      </header>
      <div className="border-b border-border bg-primary/10 px-5 py-3 text-center text-xs">{t('gifts.previewNotice')}</div>
      <Routes>
        <Route path="/" element={<main><MusicalGiftsSection /></main>} />
        {giftProducts.map(item => <Route key={item.id} path={item.path} element={<GiftProductView product={item.id} />} />)}
        <Route path="*" element={<main className="p-8"><Link to="/">{t('gifts.back')}</Link></main>} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="gifts-preview-theme">
      <BrowserRouter><Suspense fallback={null}><Preview /></Suspense></BrowserRouter>
    </ThemeProvider>
  </HelmetProvider>,
);
