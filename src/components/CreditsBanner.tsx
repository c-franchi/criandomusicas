import { ChevronRight, Crown, Music, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCredits, getPlanLabel } from '@/hooks/useCredits';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditsBannerProps {
  className?: string;
  showBuyButton?: boolean;
  compact?: boolean;
}

export function CreditsBanner({ className = '', showBuyButton = true, compact = false }: CreditsBannerProps) {
  const { t } = useTranslation('common');
  const { loading, hasCredits, totalCredits, subscriptionInfo, previewCreditAvailable } = useCredits();

  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    );
  }

  // Calculate display credits (include preview if available and no other credits)
  const displayCredits = totalCredits > 0 ? totalCredits : (previewCreditAvailable ? 1 : 0);
  const isOnlyPreview = totalCredits === 0 && previewCreditAvailable;

  if (!hasCredits && !previewCreditAvailable) {
    if (!showBuyButton) return null;
    
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Button asChild size="sm" variant="default" className="rounded-full">
          <Link to="/planos">
            {t('credits.viewPackages', 'Ver Pacotes')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  // Determine the source
  const isFromSubscription = subscriptionInfo && subscriptionInfo.credits_remaining > 0;
  const sourceLabel = isFromSubscription 
    ? subscriptionInfo.plan_name || 'Creator'
    : null;

  // Compact mode - inline badges
  if (compact) {
    return (
      <div className={`flex gap-2 flex-wrap items-center ${className}`}>
        <Badge className={`gap-1.5 ${isOnlyPreview ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-primary/20 text-primary border-primary/30'} hover:opacity-80`}>
          <Music className="w-3 h-3" />
          {isOnlyPreview ? t('credits.previewFree', '1 preview grátis') : `${displayCredits} ${displayCredits === 1 ? t('credits.credit') : t('credits.credits')}`}
        </Badge>
        {isFromSubscription && (
          <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
            <Crown className="w-3 h-3" />
            {sourceLabel}
          </Badge>
        )}
      </div>
    );
  }

  // Default: clean horizontal layout
  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      {isFromSubscription && (
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-amber-500 border-amber-500/30 bg-amber-500/10">
          <Crown className="w-3.5 h-3.5" />
          <span className="font-medium">{sourceLabel}</span>
        </Badge>
      )}
      
      {isOnlyPreview ? (
        <Badge className="gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-semibold">{t('credits.previewFree', '1 preview grátis')}</span>
          <span className="text-xs opacity-80">(40s)</span>
        </Badge>
      ) : (
        <Badge className="gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
          <Music className="w-3.5 h-3.5" />
          <span className="font-semibold">{displayCredits}</span>
          <span className="text-xs opacity-80">{displayCredits === 1 ? t('credits.credit') : t('credits.credits')}</span>
        </Badge>
      )}
      
      {showBuyButton && (
        <Button asChild size="sm" variant="default" className="rounded-full h-8 px-4">
          <Link to="/briefing">
            {t('credits.createButton', 'Criar')}
          </Link>
        </Button>
      )}
    </div>
  );
}

export default CreditsBanner;
