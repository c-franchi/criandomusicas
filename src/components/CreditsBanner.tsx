import { Music, Sparkles, ChevronRight, Crown, Mic, Piano } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const { loading, hasCredits, totalAvailable, totalVocal, totalInstrumental, activePackage, subscriptionInfo } = useCredits();

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </Card>
    );
  }

  if (!hasCredits) {
    if (!showBuyButton) return null;
    
    return (
      <Card className={`p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{t('credits.noCredits', 'Sem créditos disponíveis')}</p>
              <p className="text-xs text-muted-foreground">{t('credits.buyPackage', 'Compre um pacote e economize!')}</p>
            </div>
          </div>
          <Button asChild size="sm" variant="default">
            <Link to="/planos">
              {t('credits.viewPackages', 'Ver Pacotes')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  // Determine the source and label
  const isFromSubscription = subscriptionInfo && subscriptionInfo.credits_remaining > 0;
  const sourceLabel = isFromSubscription 
    ? subscriptionInfo.plan_name || 'Assinatura Creator'
    : activePackage 
      ? getPlanLabel(activePackage.plan_id)
      : null;

  // Check credit type from subscription
  const subscriptionIsInstrumental = subscriptionInfo?.is_instrumental || false;

  if (compact) {
    // Show separate badges for each credit type
    const badges = [];
    
    if (totalVocal > 0) {
      badges.push(
        <Badge key="vocal" className="gap-1.5 bg-primary text-white border-primary">
          <Mic className="w-3 h-3" />
          {totalVocal} vocal{totalVocal !== 1 ? 'is' : ''}
        </Badge>
      );
    }
    
    if (totalInstrumental > 0) {
      badges.push(
        <Badge key="instrumental" className="gap-1.5 bg-purple-600 text-white border-purple-600">
          <Piano className="w-3 h-3" />
          {totalInstrumental} instrumental{totalInstrumental !== 1 ? 'is' : ''}
        </Badge>
      );
    }
    
    return <div className="flex gap-2 flex-wrap">{badges}</div>;
  }

  return (
    <Card className={`p-4 ${isFromSubscription ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30' : 'bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30'} ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isFromSubscription ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
            {isFromSubscription ? (
              <Crown className="w-5 h-5 text-amber-600" />
            ) : (
              <Music className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            {/* Show credits by type if both exist */}
            {totalVocal > 0 && totalInstrumental > 0 ? (
              <div className="space-y-1">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Mic className="w-4 h-4 text-primary" />
                    {totalVocal} vocal{totalVocal !== 1 ? 'is' : ''}
                  </span>
                  <span className="text-muted-foreground">+</span>
                  <span className="inline-flex items-center gap-1">
                    <Piano className="w-4 h-4 text-purple-500" />
                    {totalInstrumental} instrumental{totalInstrumental !== 1 ? 'is' : ''}
                  </span>
                </p>
                {sourceLabel && (
                  <p className="text-xs text-muted-foreground">
                    {isFromSubscription ? (
                      <>
                        <Crown className="w-3 h-3 inline mr-1" />
                        {sourceLabel}
                      </>
                    ) : (
                      sourceLabel
                    )}
                  </p>
                )}
              </div>
            ) : (
              // Single type of credit
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  {totalInstrumental > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Piano className="w-4 h-4 text-purple-500" />
                      {totalInstrumental} música{totalInstrumental !== 1 ? 's' : ''} instrumental{totalInstrumental !== 1 ? 'is' : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-primary" />
                      {totalVocal} música{totalVocal !== 1 ? 's' : ''} vocal{totalVocal !== 1 ? 'is' : ''}
                    </span>
                  )}
                </p>
                {sourceLabel && (
                  <p className="text-xs text-muted-foreground">
                    {isFromSubscription ? (
                      <>
                        <Crown className="w-3 h-3 inline mr-1" />
                        {sourceLabel} • {subscriptionInfo?.credits_used || 0}/{subscriptionInfo?.credits_total || 0} usados
                      </>
                    ) : (
                      <>
                        {sourceLabel} • {activePackage?.used_credits || 0}/{activePackage?.total_credits || 0} usados
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <Button asChild size="sm" variant="default">
          <Link to="/briefing">
            {t('credits.createMusic', 'Criar Música')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export default CreditsBanner;
