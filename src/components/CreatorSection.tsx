import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Clock, Users, ArrowRight, Sparkles, Video, Headphones, Crown, Check, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import PlanTypeToggle from "@/components/PlanTypeToggle";
import { motion } from "framer-motion";

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const cardHoverVariants = {
  rest: { 
    scale: 1, 
    y: 0,
    boxShadow: "0 4px 24px -4px hsl(240 10% 10% / 0.08)"
  },
  hover: { 
    scale: 1.02, 
    y: -8,
    boxShadow: "0 20px 40px -8px hsl(259 94% 51% / 0.25)",
    transition: {
      duration: 0.3,
      ease: "easeOut" as const
    }
  },
};

// Creator plan data with credits and descriptions
const CREATOR_PLANS = [
  {
    id: 'creator_start',
    name: 'Creator Start',
    credits: 50,
    price: 2990, // cents
    popular: false,
  },
  {
    id: 'creator_pro',
    name: 'Creator Pro',
    credits: 150,
    price: 4990, // cents
    popular: true,
  },
  {
    id: 'creator_studio',
    name: 'Creator Studio',
    credits: 300,
    price: 7990, // cents
    popular: false,
  },
];

const CreatorSection = () => {
  const { t, i18n } = useTranslation('pricing');
  const [isInstrumental, setIsInstrumental] = useState(false);

  // Format price based on language
  const formatPrice = (cents: number): string => {
    const value = cents / 100;
    if (i18n.language === 'pt-BR') {
      return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }
    return `R$ ${value.toFixed(2)}`;
  };

  // Get plan description with credits
  const getPlanDescription = (planId: string, credits: number): string => {
    const songWord = i18n.language === 'pt-BR' ? 'músicas' 
      : i18n.language === 'es' ? 'canciones' 
      : i18n.language === 'it' ? 'canzoni' 
      : 'songs';
    
    const monthWord = i18n.language === 'pt-BR' ? 'mês' 
      : i18n.language === 'es' ? 'mes' 
      : i18n.language === 'it' ? 'mese' 
      : 'month';

    if (planId === 'creator_start') {
      const desc = i18n.language === 'pt-BR' ? 'Ideal para criadores que estão começando' 
        : i18n.language === 'es' ? 'Ideal para creadores que están comenzando' 
        : i18n.language === 'it' ? 'Ideale per creator che stanno iniziando' 
        : 'Ideal for creators just starting out';
      return `${credits} ${songWord}/${monthWord} • ${desc}`;
    }
    
    if (planId === 'creator_pro') {
      const desc = i18n.language === 'pt-BR' ? 'Para criadores de conteúdo frequentes' 
        : i18n.language === 'es' ? 'Para creadores de contenido frecuentes' 
        : i18n.language === 'it' ? 'Per creator di contenuti frequenti' 
        : 'For frequent content creators';
      return `${credits} ${songWord}/${monthWord} • ${desc}`;
    }
    
    if (planId === 'creator_studio') {
      const desc = i18n.language === 'pt-BR' ? 'Produção em escala para profissionais' 
        : i18n.language === 'es' ? 'Producción a escala para profesionales' 
        : i18n.language === 'it' ? 'Produzione su larga scala per professionisti' 
        : 'Scale production for professionals';
      return `${credits} ${songWord}/${monthWord} • ${desc}`;
    }
    
    return `${credits} ${songWord}/${monthWord}`;
  };

  // Get features for Creator plans
  const getCreatorFeatures = (): string[] => {
    if (i18n.language === 'pt-BR') {
      return [
        'Letras curadas por humanos',
        'Capas prontas para thumbnail',
        'Formatos curtos (30s/60s)',
        'Suporte prioritário',
        '100% original e monetizável',
      ];
    }
    if (i18n.language === 'es') {
      return [
        'Letras curadas por humanos',
        'Portadas listas para miniatura',
        'Formatos cortos (30s/60s)',
        'Soporte prioritario',
        '100% original y monetizable',
      ];
    }
    if (i18n.language === 'it') {
      return [
        'Testi curati da umani',
        'Copertine pronte per miniatura',
        'Formati brevi (30s/60s)',
        'Supporto prioritario',
        '100% originale e monetizzabile',
      ];
    }
    return [
      'Human-curated lyrics',
      'Thumbnail-ready covers',
      'Short formats (30s/60s)',
      'Priority support',
      '100% original & monetizable',
    ];
  };

  const features = getCreatorFeatures();

  return (
    <section className="py-20 bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10 overflow-hidden" id="criadores">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge + Headline */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1.5 text-sm">
              🎬 {t('creator.badge')}
            </Badge>
          </motion.div>
          
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {t('creator.title')} <span className="gradient-text">{t('creator.titleHighlight')}</span>
          </motion.h2>
          
          <motion.p 
            className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {t('creator.description')}
          </motion.p>
          
          <motion.p 
            className="text-muted-foreground text-sm max-w-2xl mx-auto mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {t('creator.subdescription')}
          </motion.p>
          
          {/* Toggle Vocal/Instrumental */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <PlanTypeToggle 
              isInstrumental={isInstrumental} 
              onToggle={setIsInstrumental}
              className="mb-4"
            />
          </motion.div>
          
          {isInstrumental && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Badge className="bg-accent/20 text-accent border-accent/30 animate-pulse">
                {t('section.instrumentalCreatorDiscount')}
              </Badge>
            </motion.div>
          )}
        </motion.div>
        
        {/* Creator Plan Cards */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
        >
          {CREATOR_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              variants={itemVariants}
              whileHover="hover"
              initial="rest"
              animate="rest"
            >
              <motion.div variants={cardHoverVariants}>
                <Card 
                  className={`relative overflow-hidden h-full ${
                    plan.popular 
                      ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20' 
                      : 'border-primary/20'
                  }`}
                >
                  {plan.popular && (
                    <motion.div 
                      className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
                      initial={{ x: 20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      {i18n.language === 'pt-BR' ? 'POPULAR' : i18n.language === 'es' ? 'POPULAR' : i18n.language === 'it' ? 'POPOLARE' : 'POPULAR'}
                    </motion.div>
                  )}
                  
                  <CardHeader className="pb-4 text-center">
                    <motion.div 
                      className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center mb-4"
                      whileHover={{ 
                        scale: 1.1, 
                        rotate: [0, -10, 10, 0],
                        transition: { duration: 0.5 }
                      }}
                    >
                      <Crown className="w-7 h-7 text-purple-400" />
                    </motion.div>
                    
                    <CardTitle className="text-xl text-card-foreground font-bold mb-2">
                      {plan.name}
                    </CardTitle>
                    
                    <div className="text-3xl font-bold text-purple-400 mb-3">
                      {formatPrice(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{i18n.language === 'pt-BR' ? 'mês' : i18n.language === 'es' ? 'mes' : i18n.language === 'it' ? 'mese' : 'month'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[40px]">
                      {getPlanDescription(plan.id, plan.credits)}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <ul className="space-y-2 mb-6">
                      {features.map((feature, idx) => (
                        <motion.li 
                          key={idx} 
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.6 + idx * 0.05 }}
                        >
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </motion.li>
                      ))}
                    </ul>
                    
                    <Button 
                      asChild 
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white' 
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <Link to="/planos#creator">
                        {i18n.language === 'pt-BR' ? 'Assinar Agora' : i18n.language === 'es' ? 'Suscribirse' : i18n.language === 'it' ? 'Abbonati Ora' : 'Subscribe Now'}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Credit Type Warning */}
        <motion.div 
          className="mb-16 mt-8 p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-amber-400 mb-1.5">
                {t('creator.creditTypeWarning.title')}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isInstrumental 
                  ? t('creator.creditTypeWarning.instrumental')
                  : t('creator.creditTypeWarning.vocal')}
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Diferenciais Grid */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-5%" }}
        >
          {[
            { icon: FileText, titleKey: 'curatedLyrics', descKey: 'curatedLyricsDesc' },
            { icon: Image, titleKey: 'readyCovers', descKey: 'readyCoversDesc' },
            { icon: Clock, titleKey: 'shortFormats', descKey: 'shortFormatsDesc' },
            { icon: Users, titleKey: 'humanSupport', descKey: 'humanSupportDesc' },
          ].map((item, index) => (
            <motion.div key={item.titleKey} variants={itemVariants}>
              <motion.div
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
              >
                <Card className="border-primary/20 hover:border-primary/50 transition-colors h-full">
                  <CardHeader className="pb-2">
                    <motion.div 
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3"
                      whileHover={{ 
                        scale: 1.15, 
                        rotate: 360,
                        transition: { duration: 0.6 }
                      }}
                    >
                      <item.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                    <CardTitle className="text-lg">{t(`creator.features.${item.titleKey}`)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm">
                    {t(`creator.features.${item.descKey}`)}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Comparison Box */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="mb-12 p-6 sm:p-8 border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <motion.div
                    animate={{ 
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      repeatDelay: 3 
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                  {t('creator.whyDifferent.title')}
                </h3>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{t('creator.whyDifferent.youDescribe')}</strong> {t('creator.whyDifferent.weTakeCare')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.div 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Headphones className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">{t('creator.badges.original')}</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Video className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">{t('creator.badges.monetizable')}</span>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button size="lg" asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-primary/30">
              <Link to="/planos#creator">
                {t('creator.cta')}
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Link>
            </Button>
          </motion.div>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('creator.pricing')}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CreatorSection;
