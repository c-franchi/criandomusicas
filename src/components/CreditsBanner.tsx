import { Music, Sparkles, ChevronRight, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const { loading, hasCredits, totalAvailable, activePackage, subscriptionInfo } = useCredits();

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
              <p className="font-medium text-sm">Sem créditos disponíveis</p>
              <p className="text-xs text-muted-foreground">Compre um pacote e economize!</p>
            </div>
          </div>
          <Button asChild size="sm" variant="default">
            <Link to="/planos">
              Ver Pacotes
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

  if (compact) {
    return (
      <Badge className={`gap-1.5 ${isFromSubscription ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' : 'bg-primary/20 text-primary border-primary/30'}`}>
        {isFromSubscription ? <Crown className="w-3 h-3" /> : <Music className="w-3 h-3" />}
        {totalAvailable} crédito{totalAvailable !== 1 ? 's' : ''}
      </Badge>
    );
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
            <p className="font-medium text-foreground">
              {totalAvailable} música{totalAvailable !== 1 ? 's' : ''} disponível{totalAvailable !== 1 ? 'is' : ''}
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
        </div>
        <Button asChild size="sm" variant="default">
          <Link to="/briefing">
            Criar Música
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export default CreditsBanner;
