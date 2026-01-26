import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, FileText, Sparkles, Music, HelpCircle, Video, Mic, Users, Clock, Star, Shield } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plan } from "@/lib/plan";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PlanTypeToggle from "@/components/PlanTypeToggle";
import { Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import CreditsBanner from "@/components/CreditsBanner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PricingPlan {
  id: string;
  name: string;
  price_cents: number;
  price_promo_cents: number | null;
  price_display: string;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
}

// Helper to format cents to BRL
const formatPrice = (cents: number): string => {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
};

// Get credits for a plan
const getCreditsForPlan = (planId: string): number => {
  // Pacotes avulsos
  if (planId.includes('subscription') && !planId.includes('creator')) return 5;
  if (planId.includes('package')) return 3;
  // Planos Creator - valores reais
  if (planId.includes('creator_studio')) return 20;
  if (planId.includes('creator_pro')) return 8;
  if (planId.includes('creator_start')) return 3;
  return 1;
};

// Calculate price per credit
const getPricePerCredit = (plan: PricingPlan): number => {
  const price = plan.price_promo_cents || plan.price_cents;
  const credits = getCreditsForPlan(plan.id);
  return Math.round(price / credits);
};

const Planos = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [vocalPlans, setVocalPlans] = useState<PricingPlan[]>([]);
  const [instrumentalPlans, setInstrumentalPlans] = useState<PricingPlan[]>([]);
  const [creatorPlans, setCreatorPlans] = useState<PricingPlan[]>([]);
  const [creatorInstrumentalPlans, setCreatorInstrumentalPlans] = useState<PricingPlan[]>([]);
  const [customLyricPlan, setCustomLyricPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Check for subscription success
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    const planFromUrl = searchParams.get('plan');
    
    if (subscriptionStatus === 'success' && planFromUrl) {
      toast({
        title: "🎉 Assinatura ativada!",
        description: `Seu plano ${planFromUrl.replace(/_/g, ' ').replace('creator ', 'Creator ')} está ativo. Comece a criar!`,
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('pricing_config')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (error) throw error;

        if (data) {
          // Separate vocal, instrumental, creator, and custom lyric plans
          const vocal = data.filter(p => ['single', 'package', 'subscription'].includes(p.id));
          const instrumental = data.filter(p => ['single_instrumental', 'package_instrumental', 'subscription_instrumental'].includes(p.id));
          const creator = data.filter(p => ['creator_start', 'creator_pro', 'creator_studio'].includes(p.id));
          const creatorInst = data.filter(p => p.id.startsWith('creator_') && p.id.includes('instrumental'));
          const customLyric = data.find(p => p.id === 'single_custom_lyric');
          
          setVocalPlans(vocal.map(p => ({ ...p, features: Array.isArray(p.features) ? p.features as string[] : [] })));
          setInstrumentalPlans(instrumental.map(p => ({ ...p, features: Array.isArray(p.features) ? p.features as string[] : [] })));
          setCreatorPlans(creator.map(p => ({ ...p, features: Array.isArray(p.features) ? p.features as string[] : [] })));
          setCreatorInstrumentalPlans(creatorInst.map(p => ({ ...p, features: Array.isArray(p.features) ? p.features as string[] : [] })));
          if (customLyric) {
            setCustomLyricPlan({ ...customLyric, features: Array.isArray(customLyric.features) ? customLyric.features as string[] : [] });
          }
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const currentPlans = isInstrumental ? instrumentalPlans : vocalPlans;

  const getPlanIcon = (planId: string) => {
    if (planId.includes('single')) return <Zap className="w-6 h-6" />;
    if (planId.includes('package')) return <Check className="w-6 h-6" />;
    if (planId.includes('subscription')) return <Crown className="w-6 h-6" />;
    return <Zap className="w-6 h-6" />;
  };

  const getButtonText = (planId: string) => {
    const credits = getCreditsForPlan(planId);
    if (credits === 1) return 'Quero esse plano';
    return `Quero ${credits} créditos`;
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user || !profile) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para escolher um plano.",
        variant: "destructive",
      });
      return;
    }

    try {
      const basePlanId = planId.replace('_instrumental', '') as Plan;
      const { error } = await supabase
        .from('profiles')
        .update({ plan: basePlanId })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Plano selecionado!",
        description: `Você escolheu o plano.`,
      });

      // Navigate to briefing with plan info
      const params = new URLSearchParams();
      if (isInstrumental) {
        params.set('instrumental', 'true');
      }
      params.set('planId', planId);
      
      navigate(`/briefing?${params.toString()}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua escolha. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Find single plan for savings calculation
  const singlePlan = currentPlans.find(p => p.id.includes('single'));
  const singlePrice = singlePlan ? (singlePlan.price_promo_cents || singlePlan.price_cents) : 990;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background py-12 px-6">
      <SEO 
        canonical="/planos"
        title="Planos e Preços"
        description="Escolha o plano ideal para criar sua música personalizada. Opções a partir de R$ 47,90 com entrega em até 48h. Pacotes para músicas vocais e instrumentais."
        keywords="planos música personalizada, preços música IA, pacote músicas, assinatura música, quanto custa música personalizada"
      />
      <div className="max-w-6xl mx-auto">
        {/* Credits Banner for logged users */}
        {user && (
          <div className="mb-8">
            <CreditsBanner showBuyButton={false} />
          </div>
        )}

        {/* Section: Para Presentes e Homenagens */}
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 px-4 py-2">
            🎁 Para Presentes e Momentos Especiais
          </Badge>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-r from-primary to-accent music-glow">
              <Crown className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold gradient-text">Planos Avulsos</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Ideal para presentes únicos: aniversários, casamentos, homenagens. Créditos que nunca expiram!
          </p>
          
          {/* Toggle Vocal/Instrumental */}
          <PlanTypeToggle 
            isInstrumental={isInstrumental} 
            onToggle={setIsInstrumental}
            className="mb-4"
          />
          
          {isInstrumental && (
            <Badge className="bg-accent/20 text-accent border-accent/30 animate-pulse mb-4">
              🎹 Músicas instrumentais com 20% de desconto!
            </Badge>
          )}
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mb-16">
            {currentPlans.map((plan) => {
              const hasPromo = plan.price_promo_cents !== null;
              const displayPrice = hasPromo ? formatPrice(plan.price_promo_cents!) : formatPrice(plan.price_cents);
              const originalPrice = hasPromo ? formatPrice(plan.price_cents) : null;
              const credits = getCreditsForPlan(plan.id);
              const pricePerCredit = getPricePerCredit(plan);
              
              // Calculate savings compared to buying singles
              const totalIfSingles = singlePrice * credits;
              const currentPrice = plan.price_promo_cents || plan.price_cents;
              const savings = totalIfSingles - currentPrice;
              const savingsPercent = Math.round((savings / totalIfSingles) * 100);
              
              return (
                <Card
                  key={plan.id}
                  className={`relative h-full flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-2xl glass-card ${
                    plan.is_popular 
                      ? "ring-2 ring-primary music-glow border-primary/50" 
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  {plan.is_popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold px-4 py-1">
                      Mais Popular
                    </Badge>
                  )}

                  {/* Credits Badge */}
                  {credits > 1 && (
                    <Badge className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 font-bold">
                      <Music className="w-3 h-3 mr-1" />
                      {credits} músicas
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <div className={`p-4 rounded-2xl ${
                        isInstrumental 
                          ? "bg-gradient-to-r from-accent to-primary music-glow"
                          : plan.id === "single" ? "bg-gradient-to-r from-primary to-accent music-glow" :
                            plan.is_popular ? "bg-gradient-to-r from-primary to-accent music-glow" :
                            "bg-gradient-to-r from-accent to-primary music-glow"
                      }`}>
                        {React.cloneElement(getPlanIcon(plan.id), {
                          className: "w-8 h-8 text-white"
                        })}
                      </div>
                    </div>
                    <CardTitle className="text-2xl mb-2 text-card-foreground font-bold">
                      {plan.name}
                    </CardTitle>
                    
                    {originalPrice ? (
                      <div className="space-y-1">
                        <CardDescription className="text-xl line-through text-muted-foreground">
                          {originalPrice}
                        </CardDescription>
                        <CardDescription className={`text-4xl font-bold ${isInstrumental ? 'text-accent' : 'text-green-500'}`}>
                          {displayPrice}
                        </CardDescription>
                      </div>
                    ) : (
                      <CardDescription className={`text-4xl font-bold ${isInstrumental ? 'text-accent' : 'gradient-text'}`}>
                        {displayPrice}
                      </CardDescription>
                    )}

                    {/* Price per credit and savings */}
                    {credits > 1 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          = {formatPrice(pricePerCredit)} por música
                        </p>
                        {savings > 0 && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Economia de {savingsPercent}% ({formatPrice(savings)})
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="p-1 rounded-full bg-primary/20 mt-0.5">
                            <Check className="w-3 h-3 text-primary flex-shrink-0" />
                          </div>
                          <span className="text-card-foreground leading-relaxed font-medium">{feature}</span>
                        </li>
                      ))}
                      {credits > 1 && (
                        <li className="flex items-start gap-3">
                          <div className="p-1 rounded-full bg-green-500/20 mt-0.5">
                            <Sparkles className="w-3 h-3 text-green-400 flex-shrink-0" />
                          </div>
                          <span className="text-green-400 leading-relaxed font-medium">
                            Use quando quiser, sem prazo!
                          </span>
                        </li>
                      )}
                    </ul>

                    <div className="mt-auto">
                      <Button
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full py-3 font-semibold transition-all duration-300 ${
                          plan.is_popular 
                            ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white music-glow" 
                            : plan.id.includes("subscription")
                            ? "bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white"
                            : ""
                        }`}
                        variant={plan.id === "single" && !hasPromo ? "outline" : "default"}
                      >
                        {getButtonText(plan.id)}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ========== SECTION: Para Criadores de Conteúdo ========== */}
        <div id="creator" className="mb-16 pt-16 border-t border-border/30">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30 px-4 py-2">
              🎬 Para Criadores de Conteúdo
            </Badge>
            <h2 className="text-4xl font-bold gradient-text mb-4">
              Planos de Assinatura Mensal
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed mb-6">
              Músicas originais em volume para YouTube, TikTok, Reels e Podcasts. 
              Sem prompts complexos, sem edição - você descreve, nós criamos.
            </p>
            
            {/* Toggle Vocal/Instrumental para Creator */}
            <PlanTypeToggle 
              isInstrumental={isInstrumental} 
              onToggle={setIsInstrumental}
              className="mb-4"
            />
            
            {isInstrumental && (
              <Badge className="bg-accent/20 text-accent border-accent/30 animate-pulse mb-4">
                🎹 Trilhas instrumentais com 20% de desconto!
              </Badge>
            )}
          </div>

          {/* Diferenciais Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Letras Curadas</h4>
              <p className="text-sm text-muted-foreground">Identidade musical consistente</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <Video className="w-8 h-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Pronto para Postar</h4>
              <p className="text-sm text-muted-foreground">Formatos 30s, 60s, completo</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Uso Comercial</h4>
              <p className="text-sm text-muted-foreground">Monetize sem preocupações</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Suporte Humano</h4>
              <p className="text-sm text-muted-foreground">Aprovação e ajustes</p>
            </div>
          </div>

          {/* Creator Plans Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              {(isInstrumental ? creatorInstrumentalPlans : creatorPlans).map((plan) => {
                const credits = getCreditsForPlan(plan.id);
                const pricePerMusic = Math.round((plan.price_promo_cents || plan.price_cents) / credits);
                const isPopular = plan.is_popular || plan.id.includes('creator_pro');
                
                // Icons based on plan
                const PlanIcon = plan.id.includes('studio') ? Crown : 
                                 plan.id.includes('pro') ? Star : Zap;
                
                return (
                  <Card
                    key={plan.id}
                    className={`relative h-full flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                      isPopular 
                        ? "ring-2 ring-purple-500 border-purple-500/50 shadow-lg shadow-purple-500/20" 
                        : "border-border/50 hover:border-purple-500/30"
                    }`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-4 py-1">
                        ⭐ Mais Popular
                      </Badge>
                    )}

                    {/* Credits Badge */}
                    <Badge className="absolute -top-3 right-4 bg-purple-500 text-white px-3 py-1 font-bold">
                      <Music className="w-3 h-3 mr-1" />
                      {credits} músicas/mês
                    </Badge>

                    <CardHeader className="text-center pb-4 pt-8">
                      <div className="flex justify-center mb-4">
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                          <PlanIcon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <CardTitle className="text-2xl mb-2 text-card-foreground font-bold">
                        {plan.name}
                      </CardTitle>
                      
                      <CardDescription className="text-4xl font-bold text-purple-400">
                        {plan.price_display}
                      </CardDescription>

                      {/* Price per music */}
                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          = {formatPrice(pricePerMusic)} por música
                        </p>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Créditos renovam mensalmente
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-3 mb-8 flex-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="p-1 rounded-full bg-purple-500/20 mt-0.5">
                              <Check className="w-3 h-3 text-purple-400 flex-shrink-0" />
                            </div>
                            <span className="text-card-foreground leading-relaxed text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto">
                        <Button
                          onClick={async () => {
                            if (!user) {
                              toast({
                                title: "Login necessário",
                                description: "Faça login para assinar um plano Creator.",
                                variant: "destructive",
                              });
                              navigate('/auth?redirect=/planos#creator');
                              return;
                            }
                            
                            setSubscribingPlan(plan.id);
                            try {
                              const { data, error } = await supabase.functions.invoke('create-creator-subscription', {
                                body: { planId: plan.id }
                              });
                              
                              if (error) throw error;
                              
                              if (data?.url) {
                                window.location.href = data.url;
                              } else {
                                throw new Error('URL de checkout não retornada');
                              }
                            } catch (err: any) {
                              console.error('Error creating subscription:', err);
                              toast({
                                title: "Erro",
                                description: err.message || "Não foi possível iniciar a assinatura. Tente novamente.",
                                variant: "destructive",
                              });
                            } finally {
                              setSubscribingPlan(null);
                            }
                          }}
                          disabled={subscribingPlan === plan.id}
                          className={`w-full py-3 font-semibold transition-all duration-300 ${
                            isPopular 
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/30" 
                              : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
                          }`}
                        >
                          {subscribingPlan === plan.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            `Assinar ${plan.name.replace(' Instrumental', '')}`
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Why Choose Us Section */}
          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-purple-400">
                Por que usar Criando Músicas em vez de ferramentas genéricas?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-semibold text-foreground mb-1">Sem Prompts Técnicos</h4>
                  <p className="text-sm text-muted-foreground">Você descreve o que quer, nós criamos</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">✨</div>
                  <h4 className="font-semibold text-foreground mb-1">Letra + Música Prontas</h4>
                  <p className="text-sm text-muted-foreground">Não é geração bruta - é conteúdo curado</p>
                </div>
                <div>
                  <div className="text-3xl mb-2">📱</div>
                  <h4 className="font-semibold text-foreground mb-1">Pronto para Publicar</h4>
                  <p className="text-sm text-muted-foreground">Direto do seu painel para as redes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How Credits Work Section */}
        <Card className="mb-16 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <HelpCircle className="w-6 h-6 text-primary" />
              Perguntas Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full max-w-2xl mx-auto">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  O que são créditos de música?
                </AccordionTrigger>
                <AccordionContent>
                  Cada crédito permite criar 1 música completa. Nos pacotes avulsos, 
                  os créditos nunca expiram. Nas assinaturas Creator, renovam mensalmente.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  Posso usar as músicas em vídeos monetizados?
                </AccordionTrigger>
                <AccordionContent>
                  Sim! As músicas criadas são 100% originais e você tem todos os direitos 
                  para uso comercial, incluindo monetização no YouTube, TikTok e Instagram.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  Os créditos da assinatura acumulam?
                </AccordionTrigger>
                <AccordionContent>
                  Não. Os créditos das assinaturas Creator renovam mensalmente e não acumulam. 
                  Se você prefere créditos que nunca expiram, escolha os pacotes avulsos.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  Posso cancelar minha assinatura?
                </AccordionTrigger>
                <AccordionContent>
                  Sim, você pode cancelar a qualquer momento. Você continua com acesso 
                  até o fim do período pago e pode usar seus créditos restantes.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  Qual a diferença entre Avulso e Assinatura?
                </AccordionTrigger>
                <AccordionContent>
                  <strong>Avulso:</strong> Ideal para presentes únicos. Créditos nunca expiram. 
                  <br /><br />
                  <strong>Assinatura Creator:</strong> Ideal para criadores de conteúdo que precisam 
                  de músicas em volume todo mês, com preço unitário muito mais baixo.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Custom Lyrics Special Section */}
        {customLyricPlan && (
          <div className="mb-16">
            <div className="text-center mb-8">
              <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 mb-4 px-4 py-2">
                <Sparkles className="w-4 h-4 mr-2 inline" />
                Novidade!
              </Badge>
              <h2 className="text-3xl font-bold gradient-text mb-4">Já Tem Sua Letra Pronta?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Traga sua própria composição e nós transformamos em música profissional por um preço especial!
              </p>
            </div>
            
            <Card className="relative max-w-lg mx-auto border-2 border-green-500/50 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent hover:border-green-400/70 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold px-6 py-1.5 shadow-lg">
                  <FileText className="w-4 h-4 mr-2" />
                  Preço Especial
                </Badge>
              </div>
              
              <CardHeader className="text-center pt-8 pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2 text-card-foreground font-bold">
                  {customLyricPlan.name}
                </CardTitle>
                <div className="space-y-1">
                  <CardDescription className="text-xl line-through text-muted-foreground">
                    {formatPrice(customLyricPlan.price_cents)}
                  </CardDescription>
                  <CardDescription className="text-5xl font-bold text-green-400">
                    {customLyricPlan.price_promo_cents 
                      ? formatPrice(customLyricPlan.price_promo_cents) 
                      : formatPrice(customLyricPlan.price_cents)}
                  </CardDescription>
                  {customLyricPlan.price_promo_cents && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse mt-2">
                      {Math.round((1 - customLyricPlan.price_promo_cents / customLyricPlan.price_cents) * 100)}% de desconto!
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pb-8">
                <ul className="space-y-4 mb-8">
                  {customLyricPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="p-1 rounded-full bg-green-500/20 mt-0.5">
                        <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                      </div>
                      <span className="text-card-foreground leading-relaxed font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate("/briefing?custom_lyric=true")}
                  className="w-full py-4 font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-lg shadow-green-500/30 transition-all duration-300"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Usar Minha Letra
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-6">
          <div className="p-6 rounded-2xl glass-card border border-border/50">
            <p className="text-foreground font-medium mb-2">
              🎵 Garantia de satisfação de 100%
            </p>
            <p className="text-muted-foreground">
              Todos os planos incluem entrega em até 48h diretamente na plataforma e suporte técnico especializado
            </p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              ← Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planos;
