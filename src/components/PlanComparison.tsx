import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Gift, Repeat, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const PlanComparison = () => {
  return (
    <section className="py-16 px-4 sm:px-6" id="comparacao">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Qual opção é <span className="gradient-text">ideal</span> para você?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Escolha entre pacotes avulsos para ocasiões especiais ou assinatura para produção de conteúdo em volume.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Pacotes Avulsos */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-500" />
                </div>
                <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                  Pacotes Avulsos
                </Badge>
              </div>
              <CardTitle className="text-2xl">Presente Único e Especial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Perfeito para aniversários, casamentos, homenagens e momentos especiais que merecem uma música única.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Ideal para ocasiões especiais</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Créditos nunca expiram</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>2 opções de letra para escolher</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Entrega em até 48h</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Pacotes de 1, 3 ou 5 músicas</span>
                </li>
              </ul>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">A partir de:</p>
                {/* IMPORTANT: Keep in sync with DB pricing_config - Single: R$ 9,90 */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-primary">R$ 9,90</span>
                  <span className="text-muted-foreground">por música</span>
                </div>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" asChild>
                  <Link to="/planos">
                    Ver Pacotes Avulsos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assinatura Creator */}
          <Card className="relative overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/10">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="absolute -top-px -right-px">
              <Badge className="rounded-tl-none rounded-br-none bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                Para Criadores
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Repeat className="w-5 h-5 text-purple-500" />
                </div>
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                  Assinatura Creator
                </Badge>
              </div>
              <CardTitle className="text-2xl">Conteúdo em Volume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Ideal para YouTubers, TikTokers e podcasters que precisam de várias músicas originais todo mês.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Músicas todo mês para YouTube, TikTok, Podcasts</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span><strong>Preço unitário até 60% menor</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Formatos otimizados (30s, 60s)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Suporte prioritário</span>
                </li>
                <li className="flex items-start gap-3 text-amber-600">
                  <span className="w-5 text-center shrink-0">⚠️</span>
                  <span className="text-sm">Créditos renovam mensalmente</span>
                </li>
              </ul>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">A partir de:</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-primary">R$ 49,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" asChild>
                  <Link to="/planos#creator">
                    Assinar Agora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          💳 Aceitamos Pix, cartão de crédito e débito • Cancele quando quiser
        </p>
      </div>
    </section>
  );
};

export default PlanComparison;
