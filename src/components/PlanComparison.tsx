import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

// Kept as the existing integration point, now a quiet audience transition, not a price comparison.
const PlanComparison = () => {
  const { t } = useTranslation('home');
  return (
    <section className="py-10 px-5 border-y border-border/40 bg-secondary/30">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-5">
        <Video className="w-7 h-7 text-primary shrink-0" />
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">{t('marketing.creatorTeaser.title')}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{t('marketing.creatorTeaser.description')}</p>
        </div>
        <Button asChild variant="outline" className="h-auto min-h-11 py-3 whitespace-normal text-left"><Link to="/criadores" onClick={() => trackEvent('marketing_cta', { audience: 'creator', placement: 'home_teaser' })}>{t('marketing.creatorTeaser.cta')}<ArrowRight className="w-4 h-4 ml-2 shrink-0" /></Link></Button>
      </div>
    </section>
  );
};
export default PlanComparison;
