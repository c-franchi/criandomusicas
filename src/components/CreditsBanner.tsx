import { ChevronRight, Crown, Mic, Piano } from 'lucide-react';
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
  const { loading, hasCredits, totalVocal, totalInstrumental, subscriptionInfo } = useCredits();

  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    );
  }

  if (!hasCredits) {
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
        {totalVocal > 0 && (
          <Badge className="gap-1.5 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
            <Mic className="w-3 h-3" />
            {totalVocal}
          </Badge>
        )}
        {totalInstrumental > 0 && (
          <Badge className="gap-1.5 bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30">
            <Piano className="w-3 h-3" />
            {totalInstrumental}
          </Badge>
        )}
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
      
      {totalVocal > 0 && (
        <Badge className="gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
          <Mic className="w-3.5 h-3.5" />
          <span className="font-semibold">{totalVocal}</span>
          <span className="text-xs opacity-80">vocal{totalVocal !== 1 ? 'is' : ''}</span>
        </Badge>
      )}
      
      {totalInstrumental > 0 && (
        <Badge className="gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30">
          <Piano className="w-3.5 h-3.5" />
          <span className="font-semibold">{totalInstrumental}</span>
          <span className="text-xs opacity-80">instrumental{totalInstrumental !== 1 ? 'is' : ''}</span>
        </Badge>
      )}
      
      {showBuyButton && (
        <Button asChild size="sm" variant="default" className="rounded-full h-8 px-4">
          <Link to="/briefing">
            Criar
          </Link>
        </Button>
      )}
    </div>
  );
}

export default CreditsBanner;
