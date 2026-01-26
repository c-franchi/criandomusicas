import { Music, Package, Calendar, CheckCircle, Clock } from 'lucide-react';
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
  const { loading, hasCredits, totalAvailable, allPackages, activePackage } = useCredits();

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

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
      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Créditos disponíveis</span>
          <Badge variant={hasCredits ? "default" : "secondary"}>
            {hasCredits ? 'Ativo' : 'Sem créditos'}
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary">{totalAvailable}</span>
          <span className="text-muted-foreground">música{totalAvailable !== 1 ? 's' : ''}</span>
        </div>
        
        {activePackage && (
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">
                {getPlanLabel(activePackage.plan_id)}
              </span>
              <span className="text-muted-foreground">
                {activePackage.used_credits}/{activePackage.total_credits} usados
              </span>
            </div>
            <Progress 
              value={(activePackage.used_credits / activePackage.total_credits) * 100} 
              className="h-2"
            />
          </div>
        )}
      </div>

      {/* Package History */}
      {allPackages.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico de Pacotes
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
      ) : (
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
      )}

      {/* Buy More CTA */}
      {allPackages.length > 0 && (
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
