import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/i18n-format";
import { trackEvent } from "@/lib/analytics";

interface CreatorPlan {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  price_promo_cents: number | null;
  is_popular: boolean;
}

const CreatorSection = () => {
  const { t, i18n } = useTranslation('pricing');
  const [plans, setPlans] = useState<CreatorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    const fetchPlans = async () => {
      const { data, error } = await supabase.from('pricing_config').select('id,name,credits,price_cents,price_promo_cents,is_popular')
        .in('id', ['creator_start', 'creator_pro', 'creator_studio']).eq('is_active', true).order('sort_order', { ascending: true });
      if (!active) return;
      if (error) { setFailed(true); setPlans([]); }
      else setPlans((data || []).filter(p => typeof p.credits === 'number' && p.credits > 0).map(p => ({ ...p, credits: p.credits ?? 0, is_popular: p.is_popular ?? false })));
      setLoading(false);
    };
    void fetchPlans();
    return () => { active = false; };
  }, [attempt]);
  const features = t('creatorLanding.planFeatures', { returnObjects: true }) as string[];
  return (
    <section className="py-16 sm:py-20 px-5 bg-secondary/30 scroll-mt-20" id="assinaturas">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm text-primary font-semibold mb-3">{t('creator.badge')}</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('creatorLanding.plansTitle')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('creatorLanding.plansDescription')}</p>
        </div>
        {loading ? <div className="min-h-80 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" aria-label={t('creatorLanding.loading')} /></div> : plans.length === 0 ? (
          <div className="min-h-40 text-center"><p className="text-muted-foreground mb-4">{t('creatorLanding.unavailable')}</p>{failed && <Button variant="outline" onClick={() => setAttempt(n => n + 1)}>{t('creatorLanding.retry')}</Button>}</div>
        ) : <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map(plan => <Card key={plan.id} className={`premium-card flex flex-col rounded-lg ${plan.is_popular ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-4 pt-6">
              <div className="flex items-center justify-between gap-2 mb-5"><Crown className="w-7 h-7 text-primary" />{plan.is_popular && <Badge>{t('popular')}</Badge>}</div>
              <CardTitle className="text-2xl mb-3">{plan.name}</CardTitle>
              {plan.price_promo_cents !== null && <p className="text-sm text-muted-foreground line-through">{formatCurrency(plan.price_cents, i18n.language, { convert: true })}</p>}
              <p className="text-3xl font-bold text-primary break-words">{formatCurrency(plan.price_promo_cents ?? plan.price_cents, i18n.language, { convert: true })}<span className="text-sm text-muted-foreground font-normal"> /{t('creatorLanding.month')}</span></p>
              <p className="text-sm font-semibold pt-2">{t('creatorLanding.credits', { count: plan.credits })}</p>
              {plan.price_promo_cents !== null && <Badge variant="outline" className="w-fit">{t('badges.promo')}</Badge>}
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <ul className="space-y-3 mb-6 flex-1">{features.map(feature => <li key={feature} className="text-sm text-muted-foreground flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{feature}</li>)}</ul>
              <Button asChild className="w-full h-auto min-h-12 py-3 whitespace-normal"><Link to={`/creator-checkout/${plan.id}`} onClick={() => trackEvent('select_creator_plan', { plan_id: plan.id, placement: 'criadores' })}>{t('creator.subscribe', { plan: plan.name })}<ArrowRight className="w-4 h-4 ml-2 shrink-0" /></Link></Button>
            </CardContent>
          </Card>)}
        </div>}
        <div className="mt-8 text-sm text-muted-foreground space-y-2 max-w-3xl mx-auto text-center leading-relaxed">
          <p>{t('creatorLanding.renewal')}</p>
          <p>{t('creatorLanding.cancellation')}</p>
          <p>{t('creatorLanding.currencyNotice')}</p>
          <Link to="/termos" className="text-primary underline underline-offset-4">{t('creatorLanding.readTerms')}</Link>
        </div>
      </div>
    </section>
  );
};
export default CreatorSection;
