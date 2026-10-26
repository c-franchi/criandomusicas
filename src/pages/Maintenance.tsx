import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Music2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import splashLogo from '@/assets/splash-logo.png';

export interface MaintenancePageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function MaintenancePage({ title, message, onRetry, retrying }: MaintenancePageProps) {
  const { t } = useTranslation('common');
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 py-12 text-foreground">
      <SEO title={t('maintenance.seoTitle')} description={t('maintenance.defaultMessage')} noIndex />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="relative w-full max-w-xl text-center">
        <img src={splashLogo} alt="Criando Músicas" className="mx-auto mb-8 h-auto w-48 sm:w-60" />
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10"><Music2 className="h-10 w-10 text-primary" strokeWidth={1.4} aria-hidden="true" /></div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-primary">{t('maintenance.badge')}</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title || t('maintenance.defaultTitle')}</h1>
        <p className="mx-auto mt-6 max-w-lg whitespace-pre-line break-words text-base leading-relaxed text-muted-foreground">{message || t('maintenance.defaultMessage')}</p>
        <p className="mt-7 inline-flex items-center gap-2 text-sm text-muted-foreground"><Heart className="h-4 w-4 text-accent" aria-hidden="true" />{t('maintenance.signature')}</p>
        <div className="mt-10 flex flex-col items-center gap-4">
          {onRetry && <Button variant="outline" onClick={onRetry} disabled={retrying} className="min-h-12"><RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />{t('maintenance.retry')}</Button>}
          <Button asChild variant="link" className="h-auto min-h-11 whitespace-normal text-sm text-muted-foreground"><Link to="/auth?redirect=%2Fadmin"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{t('maintenance.adminLogin')}</Link></Button>
          <div className="flex gap-5 text-xs text-muted-foreground"><Link to="/privacidade" className="underline underline-offset-4">{t('maintenance.privacy')}</Link><Link to="/termos" className="underline underline-offset-4">{t('maintenance.terms')}</Link></div>
        </div>
      </div>
    </main>
  );
}
