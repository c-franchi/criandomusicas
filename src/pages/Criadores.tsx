import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Video, Mic, MonitorPlay, Briefcase, Music, FileText, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import AppHeader from "@/components/AppHeader";
import CreatorSection from "@/components/CreatorSection";
import AudioSamples from "@/components/AudioSamples";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import SEO from "@/components/SEO";
import creatorPhoto from "@/assets/hero-music.jpg";
import { trackEvent } from "@/lib/analytics";

export default function Criadores() {
  const { t } = useTranslation('pricing');
  const uses = t('creatorLanding.useCases', { returnObjects: true }) as { title: string; description: string }[];
  const steps = t('creatorLanding.steps', { returnObjects: true }) as { title: string; description: string }[];
  const questions = t('creatorLanding.faq', { returnObjects: true }) as { q: string; a: string }[];
  const useIcons = [MonitorPlay, Video, Mic, Briefcase];
  const stepIcons = [FileText, Music, Download];
  return (
    <main className="min-h-screen bg-background">
      <SEO canonical="/criadores" title={t('creatorLanding.seoTitle')} description={t('creatorLanding.seoDescription')} />
      <section className="marketing-hero relative flex items-center overflow-hidden">
        <img src={creatorPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" />
        <div className="marketing-hero-overlay absolute inset-0" />
        <AppHeader variant="floating" showLogo showHomeButton showAnchors={false} />
        <div className="relative max-w-6xl mx-auto w-full px-5 pt-28 pb-14">
          <p className="text-sm text-primary font-semibold mb-5">{t('creator.badge')}</p>
          <p className="font-semibold mb-3">Criando Músicas</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold max-w-3xl leading-tight mb-6">{t('creatorLanding.headline')} <span className="gradient-text">{t('creatorLanding.headlineHighlight')}</span></h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-7 leading-relaxed">{t('creatorLanding.subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <Button asChild variant="hero" size="lg" className="h-auto min-h-12 py-4 whitespace-normal"><a href="#assinaturas" onClick={() => trackEvent('marketing_cta', { audience: 'creator', destination: 'plans' })}>{t('creatorLanding.cta')}<ArrowRight className="w-5 h-5 ml-2" /></a></Button>
            <Button asChild variant="outline" size="lg"><a href="#exemplos">{t('creatorLanding.samplesCta')}</a></Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6 max-w-2xl">{t('creatorLanding.licenseShort')}</p>
        </div>
      </section>
      <section className="py-14 sm:py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-10">{t('creatorLanding.usesTitle')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">{uses.map((item, index) => { const Icon = useIcons[index] || Video; return <article key={item.title} className="border-t border-border pt-5"><Icon className="w-7 h-7 text-primary mb-4" /><h3 className="text-lg font-semibold mb-3">{item.title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p></article>; })}</div>
        </div>
      </section>
      <AudioSamples audioType="instrumental" />
      <section className="py-14 sm:py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-10">{t('creatorLanding.processTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-8">{steps.map((item, index) => { const Icon = stepIcons[index] || Music; return <article key={item.title} className="border-t border-border pt-5"><div className="flex items-center gap-3 mb-4"><Icon className="w-6 h-6 text-primary" /><span className="text-sm text-muted-foreground">0{index + 1}</span></div><h3 className="text-xl font-semibold mb-3">{item.title}</h3><p className="text-muted-foreground leading-relaxed">{item.description}</p></article>; })}</div>
          <p className="text-sm text-muted-foreground mt-8">{t('creatorLanding.delivery')}</p>
        </div>
      </section>
      <CreatorSection />
      <section className="py-14 sm:py-20 px-5" id="licencas">
        <div className="max-w-4xl mx-auto">
          <ShieldCheck className="w-8 h-8 text-primary mb-5" />
          <h2 className="text-3xl font-bold mb-6">{t('creatorLanding.rightsTitle')}</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">{(t('creatorLanding.rights', { returnObjects: true }) as string[]).map(item => <p key={item}>{item}</p>)}</div>
          <div className="flex flex-wrap gap-3 mt-6"><Button asChild variant="outline"><Link to="/termos">{t('creatorLanding.readTerms')}</Link></Button><Button asChild variant="ghost"><Link to="/regras">{t('creatorLanding.readRules')}</Link></Button></div>
        </div>
      </section>
      <section className="py-14 px-5 bg-secondary/30">
        <div className="max-w-3xl mx-auto"><h2 className="text-3xl font-bold mb-6">{t('creatorLanding.faqTitle')}</h2><Accordion type="single" collapsible>{questions.map((item, index) => <AccordionItem key={item.q} value={String(index)}><AccordionTrigger className="text-left">{item.q}</AccordionTrigger><AccordionContent className="text-muted-foreground leading-relaxed">{item.a}</AccordionContent></AccordionItem>)}</Accordion></div>
      </section>
      <section className="py-12 px-5 text-center"><p className="text-muted-foreground mb-4">{t('creatorLanding.giftAlternative')}</p><Button asChild variant="outline"><Link to="/planos">{t('creatorLanding.packagesCta')}<ArrowRight className="w-4 h-4 ml-2" /></Link></Button></section>
      <Footer />
      <CookieConsent />
    </main>
  );
}
