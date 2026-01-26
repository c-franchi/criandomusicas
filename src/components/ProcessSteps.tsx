import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Music, Share2, Package, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ProcessSteps = () => {
  const steps = [
    {
      icon: FileText,
      title: "Conte sua história",
      description: "Você escreve os detalhes, sentimentos ou a ideia da música.",
      badge: "1"
    },
    {
      icon: Music,
      title: "Nós criamos a música",
      description: "Transformamos sua história em uma música única, no estilo que você escolher.",
      badge: "2"
    },
    {
      icon: Share2,
      title: "Receba e compartilhe",
      description: "Baixe sua música e, se quiser, receba também o vídeo pronto para emocionar.",
      badge: "3"
    }
  ];

  return (
    <section id="processo" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Como{" "}
            <span className="gradient-text">funciona</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            É simples, rápido e você não precisa saber nada de música
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          {steps.map((step, index) => (
            <Card key={index} className="relative p-6 bg-card/80 border border-primary/30 hover:border-[hsl(45,100%,50%)] transition-all duration-300">
              <div className="absolute -top-4 left-6">
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {step.badge}
                </Badge>
              </div>
              
              <div className="mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              
              {/* Step number */}
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground">
                {index + 1}
              </div>
            </Card>
          ))}
        </div>

        {/* Credits Info Section */}
        <Card className="p-8 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/20 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Package className="w-10 h-10 text-primary" />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Economize com Pacotes de Músicas
              </h3>
              <p className="text-muted-foreground mb-4">
                Compre um pacote e crie múltiplas músicas pagando menos! 
                Seus créditos ficam salvos e você usa quando quiser — 
                sem precisar pagar a cada nova música.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full">
                  <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                    3 músicas
                  </Badge>
                  <span className="text-muted-foreground">Economia de 16%</span>
                </div>
                <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full">
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    5 músicas
                  </Badge>
                  <span className="text-muted-foreground">Maior economia</span>
                </div>
              </div>
            </div>
            
            <Button asChild size="lg" className="shrink-0">
              <Link to="/planos">
                Ver Pacotes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ProcessSteps;