import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Music, ArrowRight, LayoutDashboard, Zap, Play, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import heroDesktop from "@/assets/hero-bg-desktop.jpg";
import heroMobile from "@/assets/hero-bg-mobile.jpg";
import AppHeader from "@/components/AppHeader";
import { trackEvent } from "@/lib/analytics";

const Hero = () => {
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const creationLink = (path: string) => user ? path : `/auth?redirect=${encodeURIComponent(path)}`;
  return (
    <section className="marketing-hero relative flex items-center justify-center overflow-hidden">
      <picture className="absolute inset-0">
        <source media="(max-width: 767px)" srcSet={heroMobile} />
        <img src={heroDesktop} alt="" className="w-full h-full object-cover" fetchPriority="high" />
      </picture>
      <div className="marketing-hero-overlay absolute inset-0" />
      <AppHeader variant="floating" showLogo />
      <div className="relative z-10 text-center max-w-4xl mx-auto px-5 pt-28 pb-12">
        <p className="text-sm font-semibold text-primary mb-5 inline-flex items-center gap-2"><Gift className="w-4 h-4" />{t('marketing.giftBadge')}</p>
        <p className="font-semibold mb-3">Criando Músicas</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">{t('marketing.headline')} <span className="gradient-text">{t('marketing.headlineHighlight')}</span></h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-7 leading-relaxed">{t('hero.subtitle')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="hero" size="lg" className="h-auto min-h-12 py-4 whitespace-normal">
            <Link to={creationLink('/briefing?type=vocal')} id="tour-hero-cta" onClick={() => trackEvent('marketing_cta', { audience: 'gift', destination: 'briefing' })}><Gift className="w-5 h-5 mr-2 shrink-0" />{t('hero.cta')}<ArrowRight className="w-5 h-5 ml-2 shrink-0" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-auto min-h-12 py-4 whitespace-normal"><a href="#exemplos"><Play className="w-4 h-4 mr-2" />{t('hero.ctaExamples')}</a></Button>
        </div>
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-4">
          <Button asChild variant="ghost" size="sm"><Link to={creationLink('/briefing?type=vocal')}><Zap className="w-4 h-4 mr-2" />{t('hero.ctaQuickCreate')}</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to={creationLink('/briefing')} id="tour-hero-secondary-cta"><Music className="w-4 h-4 mr-2" />{t('hero.ctaComplete')}</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to={creationLink('/briefing?mode=audio')}><Play className="w-4 h-4 mr-2" />{t('marketing.audioCta')}</Link></Button>
          {user && <Button asChild variant="ghost" size="sm"><Link to="/dashboard" id="tour-dashboard-link"><LayoutDashboard className="w-4 h-4 mr-2" />{t('hero.ctaDashboard')}</Link></Button>}
          {isAdmin && <Button asChild variant="ghost" size="sm"><Link to="/admin"><LayoutDashboard className="w-4 h-4 mr-2" />{t('marketing.admin')}</Link></Button>}
        </div>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-7" aria-label={t('marketing.occasionsLabel')}>
          {(t('marketing.occasions', { returnObjects: true }) as string[]).map(occasion => <li key={occasion} className="inline-flex items-center gap-1.5"><Gift className="w-3 h-3 text-accent" />{occasion}</li>)}
        </ul>
      </div>
    </section>
  );
};
export default Hero;
