import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Music, Share2, Package, Sparkles, ChevronRight, Gift, Check, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const ProcessSteps = () => {
  const { t } = useTranslation('home');
  const { user } = useAuth();

  const steps = [
    {
      icon: FileText,
      title: t('process.step1.title'),
      description: t('process.step1.description'),
      badge: "1"
    },
    {
      icon: Music,
      title: t('process.step2.title'),
      description: t('process.step2.description'),
      badge: "2"
    },
    {
      icon: Share2,
      title: t('process.step3.title'),
      description: t('process.step3.description'),
      badge: "3"
    }
  ];

  return (
    <section id="processo" className="section-spacing gradient-section">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t('process.title')}{" "}
            <span className="gradient-text">{t('process.titleHighlight')}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('process.subtitle')}
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card className="premium-card relative p-8 h-full">
                <div className="absolute -top-4 left-6">
                  <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-lg">
                    {step.badge}
                  </Badge>
                </div>
                
                <div className="mt-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Free Preview Card - Only for non-logged users */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-16"
          >
            <Card className="p-8 max-w-4xl mx-auto border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                  <Gift className="w-10 h-10 text-emerald-500" />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-2 text-emerald-500">
                    {t('process.preview.title', '🎁 Preview Gratuito')}
                  </h3>
                  <p className="text-foreground/80 mb-4 leading-relaxed">
                    {t('process.preview.description', 'Crie sua conta e teste o sistema de graça! Você recebe 1 crédito para gerar uma prévia (Verso + Refrão) da sua música.')}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start text-sm">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span>{t('process.preview.benefit1', 'Sem compromisso')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span>{t('process.preview.benefit2', 'Conheça o estilo antes de comprar')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span>{t('process.preview.benefit3', 'Cadastro simples e rápido')}</span>
                    </div>
                  </div>
                </div>
                
                <Button asChild size="lg" className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400">
                  <Link to="/auth">
                    {t('process.preview.cta', 'Começar Grátis')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Audio Mode - New Feature */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mb-16"
        >
          <Card className="p-6 max-w-4xl mx-auto border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 hover:border-primary/50 transition-colors">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <h3 className="text-xl font-bold">
                    {t('process.audioMode.title', '🎤 Modo Áudio')}
                  </h3>
                  <Badge className="text-xs px-2 py-0.5 bg-emerald-500 text-white border-0">
                    Novo!
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t('process.audioMode.description', 'Grave ou envie um áudio cantando um trecho e nossa IA transcreve e transforma em uma música completa com letra profissional no formato Suno.')}
                </p>
              </div>

              <Button asChild size="lg" className="shrink-0 rounded-xl">
                <Link to="/briefing?type=vocal">
                  Experimentar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Credits Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="p-8 glass-card max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                <Package className="w-10 h-10 text-primary" />
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  {t('process.packages.title')}
                </h3>
                <p className="text-foreground/80 mb-4 leading-relaxed">
                  {t('process.packages.description')}
                </p>
                
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                  <div className="flex items-center gap-2 bg-background/50 px-4 py-2 rounded-full border border-primary/20">
                    <Badge className="bg-accent text-white border-0 shadow-sm">
                      {t('process.packages.songs3')}
                    </Badge>
                    <span className="text-muted-foreground">{t('process.packages.savings16')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-background/50 px-4 py-2 rounded-full border border-primary/20">
                    <Badge className="bg-primary text-white border-0 shadow-sm">
                      {t('process.packages.songs5')}
                    </Badge>
                    <span className="text-muted-foreground">{t('process.packages.bestSavings')}</span>
                  </div>
                </div>
              </div>
              
              <Button asChild size="lg" className="shrink-0 rounded-xl">
                <Link to="/planos">
                  {t('process.packages.viewPackages')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ProcessSteps;
