import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CreditCard, Music, Share2 } from "lucide-react";

const ProcessSteps = () => {
  const steps = [
    {
      icon: FileText,
      title: "Conte sua História",
      description: "Compartilhe a ocasião, estilo musical e conte qualquer história, homenagem ou momento especial",
      badge: "3 min"
    },
    {
      icon: CreditCard,
      title: "Pagamento Seguro",
      description: "PIX ou cartão. Aprovação instantânea para começar a criar",
      badge: "Seguro"
    },
    {
      icon: Music,
      title: "2 Letras Personalizadas",
      description: "Receba 2 versões de letras personalizadas. Escolha a favorita",
      badge: "IA"
    },
    {
      icon: Share2,
      title: "Entrega Completa",
      description: "Música finalizada no WhatsApp + opção de publicar no YouTube",
      badge: "48h"
    }
  ];

  return (
    <section id="processo" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Como funciona o{" "}
            <span className="gradient-text">processo</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Do briefing à entrega, um processo simples e transparente
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="relative p-6 glass-card border-border/50 hover:border-primary/50 transition-all duration-300">
              <div className="absolute -top-4 left-6">
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {step.badge}
                </Badge>
              </div>
              
              <div className="mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              
              {/* Step number */}
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-accent-foreground">
                {index + 1}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSteps;