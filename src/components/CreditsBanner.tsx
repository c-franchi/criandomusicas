import { Music, Sparkles, ChevronRight } from 'lucide-react';
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
  const { loading, hasCredits, totalAvailable, activePackage } = useCredits();

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

  if (compact) {
    return (
      <Badge className="bg-primary/20 text-primary border-primary/30 gap-1.5">
        <Music className="w-3 h-3" />
        {totalAvailable} crédito{totalAvailable !== 1 ? 's' : ''}
      </Badge>
    );
  }

  return (
    <Card className={`p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {totalAvailable} música{totalAvailable !== 1 ? 's' : ''} disponível{totalAvailable !== 1 ? 'is' : ''}
            </p>
            {activePackage && (
              <p className="text-xs text-muted-foreground">
                {getPlanLabel(activePackage.plan_id)} • {activePackage.used_credits}/{activePackage.total_credits} usados
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
