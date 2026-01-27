import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Music, Sparkles, Headphones, ArrowRight, LayoutDashboard, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useCredits } from "@/hooks/useCredits";
import heroImage from "@/assets/hero-music.jpg";
import AppHeader from "@/components/AppHeader";

const Hero = () => {
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { hasCredits } = useCredits();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20" 
        style={{ backgroundImage: `url(${heroImage})` }}
        role="img"
        aria-label="Músico criando música personalizada em estúdio profissional - Criando Músicas"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/80 to-accent/30" />
      
      {/* App Header */}
      <AppHeader variant="floating" />
      
      {/* Floating Elements - decorative, hidden from screen readers */}
      <div className="absolute top-20 left-10 animate-float" aria-hidden="true">
        <Music className="w-12 h-12 text-primary/60" />
      </div>
      <div className="absolute bottom-32 right-16 animate-float" style={{ animationDelay: '2s' }} aria-hidden="true">
        <Sparkles className="w-8 h-8 text-accent/60" />
      </div>
      <div className="absolute top-1/2 left-20 animate-float" style={{ animationDelay: '4s' }} aria-hidden="true">
        <Headphones className="w-10 h-10 text-primary/40" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight px-0 my-[67px]">
          {t('hero.title1')}{" "}
          <span className="gradient-text">{t('hero.titleHighlight1')}</span>
          <br />
          {t('hero.title2')}{" "}
          <span className="gradient-text">{t('hero.titleHighlight2')}</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="hero" size="lg" className="text-lg px-8 py-6 group">
                    <LayoutDashboard className="w-5 h-5 mr-2" />
                    Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
              <Link to="/dashboard">
                <Button variant={isAdmin ? "outline" : "hero"} size="lg" className="text-lg px-8 py-6 group">
                  {t('hero.ctaDashboard')}
                  {!isAdmin && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </Link>
              <Link to="/briefing">
                <Button 
                  variant={hasCredits ? "hero" : "outline"} 
                  size="lg" 
                  className={`text-lg px-8 py-6 group ${hasCredits ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400' : ''}`}
                >
                  {hasCredits ? (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      {t('hero.ctaUseCredit')}
                    </>
                  ) : (
                    t('hero.ctaNewSong')
                  )}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/briefing">
                <Button variant="hero" size="lg" className="text-lg px-8 py-6 group">
                  {t('hero.cta')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                variant="glass" 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => document.getElementById('exemplos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('hero.ctaExamples')}
              </Button>
            </>
          )}
        </div>
        
        {/* Micro Social Proof */}
        <div className="mt-6 text-muted-foreground text-sm md:text-base">
          <span className="text-accent">⭐⭐⭐⭐⭐</span>{" "}
          {t('hero.socialProof')}
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-12 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">500+</div>
            <div className="text-muted-foreground">{t('hero.stats.songs')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">48h</div>
            <div className="text-muted-foreground">{t('hero.stats.time')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">5.0★</div>
            <div className="text-muted-foreground">{t('hero.stats.rating')}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
