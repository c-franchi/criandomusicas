import { Music, Package, Calendar, CheckCircle, Clock, Crown, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useCredits, getPlanLabel } from '@/hooks/useCredits';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreditsManagementProps {
  className?: string;
}

export function CreditsManagement({ className = '' }: CreditsManagementProps) {
  const { loading, hasCredits, totalAvailable, allPackages, activePackage, subscriptionInfo, previewCreditAvailable } = useCredits();

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  const hasSubscriptionCredits = subscriptionInfo && subscriptionInfo.credits_remaining > 0;
  const hasPackageCredits = allPackages.some(p => p.available_credits > 0);
  
  // Calculate display value including preview credit
  const displayAvailable = totalAvailable > 0 ? totalAvailable : (previewCreditAvailable ? 1 : 0);
  const isOnlyPreview = totalAvailable === 0 && previewCreditAvailable;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-full bg-primary/20">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Meus Créditos de Música</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie seus pacotes e créditos disponíveis
          </p>
        </div>
      </div>

      {/* Current Balance */}
      <div className={`p-4 rounded-lg border mb-6 ${isOnlyPreview ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20' : 'bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Créditos disponíveis</span>
          <Badge variant={hasCredits || previewCreditAvailable ? "default" : "secondary"} className={isOnlyPreview ? 'bg-emerald-500/20 text-emerald-600' : ''}>
            {isOnlyPreview ? 'Preview Grátis' : (hasCredits ? 'Ativo' : 'Sem créditos')}
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${isOnlyPreview ? 'text-emerald-600' : 'text-primary'}`}>{displayAvailable}</span>
          <span className="text-muted-foreground">
            {isOnlyPreview ? 'preview (verso + refrão)' : `música${displayAvailable !== 1 ? 's' : ''}`}
          </span>
        </div>
        {isOnlyPreview && (
          <p className="text-xs text-emerald-600/80 mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Crie uma prévia com verso e refrão da sua música gratuitamente!
          </p>
        )}
      </div>

      {/* Subscription Credits Section */}
      {hasSubscriptionCredits && subscriptionInfo && (
        <div className="mb-6">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-500" />
            Assinatura Creator
          </h4>
          
          <div className="p-4 rounded-lg border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">{subscriptionInfo.plan_name}</span>
              </div>
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                Ativo
              </Badge>
            </div>
            
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-amber-600">
                {subscriptionInfo.credits_remaining}
              </span>
              <span className="text-muted-foreground">
                de {subscriptionInfo.credits_total} créditos restantes
              </span>
            </div>
            
            <Progress 
              value={(subscriptionInfo.credits_used / subscriptionInfo.credits_total) * 100} 
              className="h-2 mb-3"
            />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Renova em: {subscriptionInfo.subscription_end 
                  ? format(new Date(subscriptionInfo.subscription_end), "dd 'de' MMM", { locale: ptBR })
                  : '-'}
              </span>
              <span>
                {subscriptionInfo.credits_used} músicas criadas este mês
              </span>
            </div>
            
            <p className="text-xs text-amber-600/80 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Créditos renovam automaticamente todo mês
            </p>
          </div>
        </div>
      )}

      {/* Package Credits History */}
      {allPackages.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pacotes Avulsos
          </h4>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allPackages.map((pkg) => {
              const usedPercent = (pkg.used_credits / pkg.total_credits) * 100;
              const isFullyUsed = pkg.used_credits >= pkg.total_credits;
              
              return (
                <div 
                  key={pkg.id}
                  className={`p-3 rounded-lg border ${
                    pkg.is_active && !isFullyUsed
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">
                        {getPlanLabel(pkg.plan_id)}
                      </span>
                    </div>
                    <Badge 
                      variant={isFullyUsed ? "secondary" : pkg.is_active ? "default" : "outline"}
                      className="text-xs"
                    >
                      {isFullyUsed ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Utilizado
                        </>
                      ) : pkg.is_active ? (
                        'Ativo'
                      ) : (
                        'Inativo'
                      )}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(pkg.purchased_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                    <span>
                      {pkg.used_credits}/{pkg.total_credits} músicas usadas
                    </span>
                  </div>
                  
                  <Progress 
                    value={usedPercent} 
                    className="h-1.5 mt-2"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : !hasSubscriptionCredits ? (
        <div className="text-center py-6">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            Você ainda não comprou nenhum pacote de músicas
          </p>
          <Button asChild>
            <Link to="/planos">
              Ver Pacotes Disponíveis
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Buy More CTA */}
      {(allPackages.length > 0 || hasSubscriptionCredits) && (
        <div className="mt-6 pt-4 border-t">
          <Button asChild className="w-full" variant={hasCredits ? "outline" : "default"}>
            <Link to="/planos">
              {hasCredits ? 'Comprar Mais Créditos' : 'Comprar Pacote de Músicas'}
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

export default CreditsManagement;
