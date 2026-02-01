import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, RefreshCw, Music, Crown, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PricingPlan {
  id: string;
  name: string;
  price_cents: number;
  price_display: string;
  price_promo_cents: number | null;
  credits: number;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  stripe_price_id: string | null;
}

const PricingManager = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setPlans((data || []).map(plan => ({
        ...plan,
        credits: plan.credits || 1,
      })));
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Erro ao carregar planos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const updatePlan = async (planId: string, updates: Partial<PricingPlan>) => {
    setSaving(planId);
    try {
      // Update price_display if price_cents changed
      let finalUpdates = { ...updates };
      if (updates.price_cents !== undefined) {
        const formattedPrice = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(updates.price_cents / 100);
        
        // Add /mês for subscription plans
        const plan = plans.find(p => p.id === planId);
        if (plan?.id.startsWith('creator_')) {
          finalUpdates.price_display = `${formattedPrice}/mês`;
        } else {
          finalUpdates.price_display = formattedPrice;
        }
      }

      const { error } = await supabase
        .from('pricing_config')
        .update(finalUpdates)
        .eq('id', planId);

      if (error) throw error;

      // Update local state
      setPlans(prev => prev.map(plan => 
        plan.id === planId ? { ...plan, ...finalUpdates } : plan
      ));

      toast({
        title: 'Plano atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });

      // Sync with Stripe if price changed
      if (updates.price_cents !== undefined) {
        await syncStripePrice(planId);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Erro ao atualizar plano',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const syncStripePrice = async (planId: string) => {
    // Sync is now manual via button - no auto sync on save to avoid errors
    console.log('Plan saved, Stripe sync available via button:', planId);
  };

  const syncAllPrices = async () => {
    setSyncing(true);
    try {
      // Get active plans to sync
      const activePlans = plans.filter(p => p.is_active);
      
      const { data, error } = await supabase.functions.invoke('sync-stripe-prices', {
        body: { plans: activePlans }
      });

      if (error) throw error;

      toast({
        title: 'Preços sincronizados',
        description: data?.message || 'Todos os preços foram sincronizados com o Stripe.',
      });

      await fetchPlans();
    } catch (error) {
      console.error('Error syncing prices:', error);
      toast({
        title: 'Erro ao sincronizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido. Verifique se você tem permissão de admin.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    if (planId.startsWith('creator_')) return <Crown className="w-5 h-5" />;
    if (planId.includes('package') || planId.includes('subscription')) return <Zap className="w-5 h-5" />;
    return <Music className="w-5 h-5" />;
  };

  const getPlanCategory = (planId: string) => {
    if (planId.startsWith('creator_')) return 'Creator';
    if (planId.includes('instrumental')) return 'Instrumental';
    return 'Avulso';
  };

  // Group plans by category
  const avulsoPlans = plans.filter(p => !p.id.startsWith('creator_') && !p.id.includes('instrumental'));
  const creatorPlans = plans.filter(p => p.id.startsWith('creator_') && !p.id.includes('instrumental'));
  const instrumentalPlans = plans.filter(p => p.id.includes('instrumental'));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const PlanCard = ({ plan }: { plan: PricingPlan }) => (
    <Card key={plan.id} className={`${!plan.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlanIcon(plan.id)}
            <CardTitle className="text-lg">{plan.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={plan.is_active ? 'default' : 'secondary'}>
              {plan.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
            {plan.is_popular && (
              <Badge className="bg-primary">Popular</Badge>
            )}
          </div>
        </div>
        <CardDescription>ID: {plan.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`price-${plan.id}`}>Preço (R$)</Label>
            <Input
              id={`price-${plan.id}`}
              type="text"
              inputMode="decimal"
              value={(plan.price_cents / 100).toFixed(2).replace('.', ',')}
              onChange={(e) => {
                // Allow typing with comma or dot as decimal separator
                const rawValue = e.target.value.replace(/[^\d,\.]/g, '').replace(',', '.');
                const numValue = parseFloat(rawValue);
                if (!isNaN(numValue)) {
                  const cents = Math.round(numValue * 100);
                  setPlans(prev => prev.map(p => 
                    p.id === plan.id ? { ...p, price_cents: cents } : p
                  ));
                } else if (rawValue === '' || rawValue === '0') {
                  setPlans(prev => prev.map(p => 
                    p.id === plan.id ? { ...p, price_cents: 0 } : p
                  ));
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price_cents / 100)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`credits-${plan.id}`}>Créditos</Label>
            <Input
              id={`credits-${plan.id}`}
              type="text"
              inputMode="numeric"
              value={plan.credits.toString()}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^\d]/g, '');
                const value = parseInt(rawValue) || 0;
                setPlans(prev => prev.map(p => 
                  p.id === plan.id ? { ...p, credits: Math.max(1, value) } : p
                ));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Músicas incluídas no plano
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`promo-${plan.id}`}>Preço Promocional (centavos)</Label>
            <Input
              id={`promo-${plan.id}`}
              type="number"
              value={plan.price_promo_cents || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : null;
                setPlans(prev => prev.map(p => 
                  p.id === plan.id ? { ...p, price_promo_cents: value } : p
                ));
              }}
              placeholder="Deixe vazio para sem promoção"
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`order-${plan.id}`}>Ordem de Exibição</Label>
            <Input
              id={`order-${plan.id}`}
              type="number"
              value={plan.sort_order}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setPlans(prev => prev.map(p => 
                  p.id === plan.id ? { ...p, sort_order: value } : p
                ));
              }}
              min={0}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id={`active-${plan.id}`}
                checked={plan.is_active}
                onCheckedChange={(checked) => updatePlan(plan.id, { is_active: checked })}
              />
              <Label htmlFor={`active-${plan.id}`}>Ativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id={`popular-${plan.id}`}
                checked={plan.is_popular}
                onCheckedChange={(checked) => updatePlan(plan.id, { is_popular: checked })}
              />
              <Label htmlFor={`popular-${plan.id}`}>Popular</Label>
            </div>
          </div>
          <Button
            onClick={() => updatePlan(plan.id, {
              price_cents: plan.price_cents,
              credits: plan.credits,
              price_promo_cents: plan.price_promo_cents,
              sort_order: plan.sort_order,
            })}
            disabled={saving === plan.id}
            size="sm"
          >
            {saving === plan.id ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Preços e Créditos</h2>
          <p className="text-muted-foreground">
            Configure valores e quantidade de créditos para cada plano
          </p>
        </div>
        <Button onClick={syncAllPrices} disabled={syncing} variant="outline">
          {syncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sincronizar com Stripe
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Os créditos são universais - podem ser usados para música vocal, instrumental ou letra própria.
          Alterações de preço são sincronizadas automaticamente com o Stripe.
        </AlertDescription>
      </Alert>

      {/* Planos Avulsos */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Music className="w-5 h-5" />
          Planos Avulsos
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {avulsoPlans.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>

      {/* Planos Creator */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Assinaturas Creator
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creatorPlans.map(plan => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>

      {/* Planos Instrumentais (inativos) */}
      {instrumentalPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
            <Zap className="w-5 h-5" />
            Planos Instrumentais (Descontinuados)
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instrumentalPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingManager;
