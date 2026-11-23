import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Crown, 
  Calendar, 
  Music, 
  AlertTriangle,
  Loader2,
  RefreshCcw,
  ExternalLink,
  CalendarX,
  Clock
} from 'lucide-react';
import { useCreatorSubscription } from '@/hooks/useCreatorSubscription';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR, enUS, es, it } from 'date-fns/locale';

interface CreatorSubscriptionManagerProps {
  className?: string;
}

export function CreatorSubscriptionManager({ className = '' }: CreatorSubscriptionManagerProps) {
  const { t: tu, i18n: paymentI18n } = useTranslation('uiPayments');
  const { 
    loading, 
    subscription, 
    hasActiveSubscription, 
    planDetails,
    cancelSubscription, 
    cancelling,
    refresh 
  } = useCreatorSubscription();
  const { toast } = useToast();
  const dateLocale = ({ en: enUS, es, it } as Record<string, typeof ptBR>)[paymentI18n.language.split('-')[0]] || ptBR;
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCancelSubscription = async () => {
    const result = await cancelSubscription();
    
    if (result.success) {
      toast({
        title: tu('subscription.cancelled'),
        description: result.cancel_at 
          ? tu('subscription.cancellationDate', { date: format(new Date(result.cancel_at), tu('subscription.shortDate'), { locale: dateLocale }) })
          : tu('subscription.cancelSuccess'),
      });
    } else {
      toast({
        title: tu('subscription.cancelError'),
        description: result.error || tu('subscription.retryLater'),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-full bg-muted">
            <Crown className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{tu('subscription.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {tu('subscription.inactive')}
            </p>
          </div>
        </div>

        <div className="text-center py-6">
          <Crown className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            {tu('subscription.pitch')}
          </p>
          <Button asChild>
            <Link to="/planos">
              {tu('subscription.viewPlans')}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  const creditsUsedPercent = subscription?.credits_total 
    ? (subscription.credits_used / subscription.credits_total) * 100 
    : 0;

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{tu('subscription.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {tu('subscription.manage')}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Cancellation Alert */}
      {subscription?.cancel_at_period_end && (
        <Alert variant="destructive" className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CalendarX className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            {tu('subscription.scheduled')}
          </AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-300/90 space-y-2">
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-4 h-4" />
              <span>
                <strong>{tu('subscription.requested')}</strong>{' '}
                {subscription?.canceled_at 
                  ? format(new Date(subscription.canceled_at), tu('subscription.dateTime'), { locale: dateLocale })
                  : tu('subscription.noDateRecorded')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarX className="w-4 h-4" />
              <span>
                <strong>{tu('subscription.accessUntil')}</strong>{' '}
                {subscription?.subscription_end 
                  ? format(new Date(subscription.subscription_end), tu('subscription.longDate'), { locale: dateLocale })
                  : tu('subscription.noDate')}
              </span>
            </div>
            <p className="text-sm mt-2 pt-2 border-t border-amber-500/30">
              {tu('subscription.accessPrefix')} <strong>{subscription?.credits_remaining} {tu('subscription.remainingCredits')}</strong> {tu('subscription.accessSuffix')}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Plan Details */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-lg">{planDetails?.name}</h4>
            <p className="text-sm text-muted-foreground">{planDetails?.price}</p>
          </div>
          <Badge variant="default" className={subscription?.cancel_at_period_end ? "bg-amber-500" : "bg-primary"}>
            {subscription?.cancel_at_period_end ? tu('subscription.cancelling') : tu('subscription.active')}
          </Badge>
        </div>

        {/* Credits Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              {tu('subscription.monthlyCredits')}
            </span>
            <span className="font-medium">
              {tu('subscription.remaining', { remaining: subscription?.credits_remaining, total: subscription?.credits_total })}
            </span>
          </div>
          <Progress value={creditsUsedPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {tu('subscription.created', { count: subscription?.credits_used ?? 0 })}
          </p>
        </div>
      </div>

      {/* Renewal Info - Only show if not canceling */}
      {!subscription?.cancel_at_period_end && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-6">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{tu('subscription.renewal')}</p>
            <p className="text-xs text-muted-foreground">
              {subscription?.subscription_end 
                ? format(new Date(subscription.subscription_end), tu('subscription.longDate'), { locale: dateLocale })
                : tu('subscription.noDate')}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button asChild variant="outline" className="w-full">
          <Link to="/planos">
            {subscription?.cancel_at_period_end ? tu('subscription.reactivate') : tu('subscription.change')}
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </Button>

        {!subscription?.cancel_at_period_end && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {tu('subscription.cancellingProgress')}
                  </>
                ) : (
                  tu('subscription.cancel')
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  {tu('subscription.confirmTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    {tu('subscription.confirmPrefix')} <strong>{planDetails?.name}</strong>?
                  </p>
                  <p>
                    {tu('subscription.keepAccessPrefix')} <strong>{subscription?.credits_remaining} {tu('subscription.remainingCredits')}</strong> {tu('subscription.periodSuffix')}{' '}
                    <strong>
                      {subscription?.subscription_end 
                        ? format(new Date(subscription.subscription_end), tu('subscription.shortDate'), { locale: dateLocale })
                        : tu('subscription.noDateLower')}
                    </strong>.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tu('subscription.noRenewal')}
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tu('subscription.keep')}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCancelSubscription}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {tu('subscription.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}

export default CreatorSubscriptionManager;
