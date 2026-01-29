import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Clock, Users, ArrowRight, Sparkles, Video, Headphones, Crown, Check, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import PlanTypeToggle from "@/components/PlanTypeToggle";

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
    <section className="py-20 bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10" id="criadores">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge + Headline */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1.5 text-sm">
            🎬 {t('creator.badge')}
          </Badge>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            {t('creator.title')} <span className="gradient-text">{t('creator.titleHighlight')}</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            {t('creator.description')}
          </p>
          
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto mb-6">
            {t('creator.subdescription')}
          </p>
          
          {/* Toggle Vocal/Instrumental */}
          <PlanTypeToggle 
            isInstrumental={isInstrumental} 
            onToggle={setIsInstrumental}
            className="mb-4"
          />
          
          {isInstrumental && (
            <Badge className="bg-accent/20 text-accent border-accent/30 animate-pulse">
              {t('section.instrumentalCreatorDiscount')}
            </Badge>
          )}
        </div>
        
        {/* Creator Plan Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {CREATOR_PLANS.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden transition-all hover:shadow-xl ${
                plan.popular 
                  ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20' 
                  : 'border-primary/20 hover:border-primary/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  {i18n.language === 'pt-BR' ? 'POPULAR' : i18n.language === 'es' ? 'POPULAR' : i18n.language === 'it' ? 'POPOLARE' : 'POPULAR'}
                </div>
              )}
              
              <CardHeader className="pb-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center mb-4">
                  <Crown className="w-7 h-7 text-purple-400" />
                </div>
                
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
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
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
          ))}
        </div>
        
        {/* Credit Type Warning */}
        <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 max-w-3xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-400">
                {t('creator.creditTypeWarning.title')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isInstrumental 
                  ? t('creator.creditTypeWarning.instrumental')
                  : t('creator.creditTypeWarning.vocal')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Diferenciais Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.curatedLyrics')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.curatedLyricsDesc')}
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <Image className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.readyCovers')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.readyCoversDesc')}
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.shortFormats')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.shortFormatsDesc')}
            </CardContent>
          </Card>
          
          <Card className="border-primary/20 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{t('creator.features.humanSupport')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('creator.features.humanSupportDesc')}
            </CardContent>
          </Card>
        </div>
        
        {/* Comparison Box */}
        <Card className="mb-12 p-6 sm:p-8 border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('creator.whyDifferent.title')}
              </h3>
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t('creator.whyDifferent.youDescribe')}</strong> {t('creator.whyDifferent.weTakeCare')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40">
                <Headphones className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">{t('creator.badges.original')}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40">
                <Video className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">{t('creator.badges.monetizable')}</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* CTA */}
        <div className="text-center">
          <Button size="lg" asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-primary/30">
            <Link to="/planos#creator">
              {t('creator.cta')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('creator.pricing')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CreatorSection;
