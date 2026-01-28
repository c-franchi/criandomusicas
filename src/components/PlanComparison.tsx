import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Gift, Repeat, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/i18n-format";

const PlanComparison = () => {
  const { t, i18n } = useTranslation('pricing');
  
  const packagesFeatures = t('comparison.packages.features', { returnObjects: true }) as string[];
  const subscriptionFeatures = t('comparison.subscription.features', { returnObjects: true }) as string[];

  // Format price with currency conversion
  const formatPrice = (cents: number) => formatCurrency(cents, i18n.language, { convert: true });

  return (
    <section className="py-16 px-4 sm:px-6" id="comparacao">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('comparison.title').split(' ').slice(0, -1).join(' ')}{' '}
            <span className="gradient-text">{t('comparison.title').split(' ').slice(-1)}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('comparison.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Pacotes Avulsos */}
          <Card className="relative overflow-visible border-2 hover:border-primary/50 transition-all premium-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-lg" />
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-500" />
                </div>
                <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                  {t('comparison.packages.badge')}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{t('comparison.packages.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t('comparison.packages.description')}
              </p>
              
              <ul className="space-y-3">
                {packagesFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className={idx === 1 ? 'font-bold' : ''}>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">{t('comparison.packages.startingAt')}</p>
                {/* Price with currency conversion - base: R$ 9,90 = 990 cents */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-primary">{formatPrice(990)}</span>
                  <span className="text-muted-foreground">{t('comparison.packages.perSong')}</span>
                </div>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" asChild>
                  <Link to="/planos">
                    {t('comparison.packages.cta')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assinatura Creator */}
          <Card className="relative overflow-visible border-2 border-primary/50 shadow-lg shadow-primary/10 premium-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-lg" />
            <div className="absolute -top-3 right-4 z-10">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg px-3 py-1">
                {t('comparison.subscription.forCreators')}
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Repeat className="w-5 h-5 text-purple-500" />
                </div>
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                  {t('comparison.subscription.badge')}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{t('comparison.subscription.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t('comparison.subscription.description')}
              </p>
              
              <ul className="space-y-3">
                {subscriptionFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className={idx === 1 ? 'font-bold' : ''}>{feature}</span>
                  </li>
                ))}
                <li className="flex items-start gap-3 text-amber-600">
                  <span className="w-5 text-center shrink-0">⚠️</span>
                  <span className="text-sm">{t('comparison.subscription.warning')}</span>
                </li>
              </ul>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">{t('comparison.subscription.startingAt')}</p>
                {/* Price with currency conversion - base: R$ 29,90 = 2990 cents (Creator Start) */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-primary">{formatPrice(2990)}</span>
                  <span className="text-muted-foreground">{t('comparison.subscription.perMonth')}</span>
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" asChild>
                  <Link to="/planos#creator">
                    {t('comparison.subscription.cta')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t('comparison.footer')}
        </p>
      </div>
    </section>
  );
};

export default PlanComparison;
