import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Zap } from "lucide-react";
const CTA = () => {
  const benefits = ["2 versões de letras personalizadas", "Entrega em até 48 horas", "Música completa e profissional", "Envio direto no WhatsApp"];
  return <section className="py-24 px-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <Badge className="mb-6 bg-accent text-accent-foreground">
          <Zap className="w-4 h-4 mr-2" />
          Oferta Especial
        </Badge>
        
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Transforme sua história em{" "}
          <span className="gradient-text">música única</span>
        </h2>
        
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Mais de 500 clientes já criaram suas músicas personalizadas. 
          Transforme qualquer momento em uma trilha sonora inesquecível.
        </p>
        
        {/* Benefits */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
          {benefits.map((benefit, index) => <div key={index} className="flex items-center gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-muted-foreground">{benefit}</span>
            </div>)}
        </div>
        
        {/* Pricing */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 mb-8 max-w-md mx-auto">
          <div className="text-4xl font-bold gradient-text mb-2">R$ 14,90</div>
          <div className="text-muted-foreground mb-4">Música completa personalizada</div>
          <div className="text-sm text-muted-foreground">
            <span className="line-through">R$ 29,90</span> • Promoção por tempo limitado
          </div>
        </div>
        
        {/* CTA Button */}
        <Button variant="hero" size="lg" className="text-lg px-8 py-6 group">
          Começar Agora
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
        
        <p className="text-sm text-muted-foreground mt-4">
          ✨ Satisfação garantida ou seu dinheiro de volta
        </p>
      </div>
    </section>;
};
export default CTA;