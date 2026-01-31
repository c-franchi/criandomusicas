import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Music, Sparkles, ArrowRight, LayoutDashboard, Zap, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useCredits } from "@/hooks/useCredits";
import heroDesktop from "@/assets/hero-bg-desktop.jpg";
import heroMobile from "@/assets/hero-bg-mobile.jpg";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";

const Hero = () => {
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const { hasCredits } = useCredits();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Images - Responsive */}
      <div className="absolute inset-0">
        {/* Desktop Background */}
        <img 
          src={heroDesktop}
          alt=""
          className="hidden md:block w-full h-full object-cover"
          role="presentation"
        />
        {/* Mobile Background */}
        <img 
          src={heroMobile}
          alt=""
          className="md:hidden w-full h-full object-cover object-right"
          role="presentation"
        />
      </div>
      
      {/* Premium Overlay - Theme-aware */}
      <div 
        className="absolute inset-0"
        style={{ background: 'var(--hero-overlay)' }}
      />
      
      {/* Additional gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
      
      {/* Subtle animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-3xl animate-float"
          style={{ background: 'var(--gradient-primary)' }}
        />
        <div 
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-15 blur-3xl animate-float"
          style={{ background: 'var(--gradient-primary)', animationDelay: '4s' }}
        />
      </div>
      
      {/* App Header */}
      <AppHeader variant="floating" />
      
      {/* Floating Elements - Premium style */}
      <motion.div 
        className="absolute top-32 left-8 md:left-16"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm flex items-center justify-center animate-float border border-primary/20">
          <Music className="w-7 h-7 text-primary" />
        </div>
      </motion.div>
      
      <motion.div 
        className="absolute bottom-40 right-8 md:right-20"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 backdrop-blur-sm flex items-center justify-center animate-float border border-accent/20" style={{ animationDelay: '2s' }}>
          <Sparkles className="w-6 h-6 text-accent" />
        </div>
      </motion.div>
      
      {/* Content */}
      <motion.div 
        className="relative z-10 text-center max-w-5xl mx-auto px-6 pt-24 pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            {t('hero.badge', 'Músicas feitas sob medida para você')}
          </span>
        </motion.div>
        
        {/* Headline */}
        <motion.h1 
          variants={itemVariants}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.1]"
        >
          {t('hero.title1')}{" "}
          <span className="gradient-text">{t('hero.titleHighlight1')}</span>
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          {t('hero.title2')}{" "}
          <span className="gradient-text">{t('hero.titleHighlight2')}</span>
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          {t('hero.subtitle')}
        </motion.p>
        
        {/* CTAs */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="hero" size="lg" className="text-lg px-8 py-7 rounded-xl group">
                    <LayoutDashboard className="w-5 h-5 mr-2" />
                    Dashboard
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
              <Link to="/dashboard">
                <Button variant={isAdmin ? "glass" : "hero"} size="lg" className="text-lg px-8 py-7 rounded-xl group">
                  {t('hero.ctaDashboard')}
                  {!isAdmin && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </Link>
              <Link to="/briefing?type=vocal">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="text-lg px-8 py-7 rounded-xl group bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {t('hero.ctaQuickCreate')}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/briefing">
                <Button variant="hero" size="lg" className="text-lg px-10 py-7 rounded-xl group shadow-2xl">
                  {t('hero.cta')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                variant="glass" 
                size="lg" 
                className="text-lg px-8 py-7 rounded-xl group"
                onClick={() => document.getElementById('exemplos')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-5 h-5 mr-2" />
                {t('hero.ctaExamples')}
              </Button>
            </>
          )}
        </motion.div>
        
        {/* Social Proof */}
        <motion.div 
          variants={itemVariants}
          className="mt-10 flex items-center justify-center gap-4 text-muted-foreground"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-background flex items-center justify-center"
              >
                <span className="text-xs font-medium text-foreground">⭐</span>
              </div>
            ))}
          </div>
          <span className="text-sm md:text-base">
            {t('hero.socialProof')}
          </span>
        </motion.div>
        
        {/* Stats */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-3 gap-6 md:gap-12 mt-16 max-w-2xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">500+</div>
            <div className="text-sm text-muted-foreground">{t('hero.stats.songs')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">48h</div>
            <div className="text-sm text-muted-foreground">{t('hero.stats.time')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">5.0★</div>
            <div className="text-sm text-muted-foreground">{t('hero.stats.rating')}</div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2">
          <motion.div 
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
