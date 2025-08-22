import { Button } from "@/components/ui/button";
import { Music, Sparkles, Headphones } from "lucide-react";
import heroImage from "@/assets/hero-music.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/80 to-accent/30" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <Music className="w-12 h-12 text-primary/60" />
      </div>
      <div className="absolute bottom-32 right-16 animate-float" style={{ animationDelay: '2s' }}>
        <Sparkles className="w-8 h-8 text-accent/60" />
      </div>
      <div className="absolute top-1/2 left-20 animate-float" style={{ animationDelay: '4s' }}>
        <Headphones className="w-10 h-10 text-primary/40" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Conte sua{" "}
          <span className="gradient-text">história</span>
          <br />
          A gente{" "}
          <span className="gradient-text">compõe</span>
          <br />
          Você{" "}
          <span className="gradient-text">emociona</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Transformamos suas memórias em músicas únicas, personalizadas e emocionantes. 
          Da história à melodia, entregamos no seu WhatsApp.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="hero" size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/briefing'}>
            Criar Minha Música
          </Button>
          <Button variant="glass" size="lg" className="text-lg px-8 py-6">
            Ver Exemplos
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">500+</div>
            <div className="text-muted-foreground">Músicas Criadas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">48h</div>
            <div className="text-muted-foreground">Tempo Médio</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">4.9★</div>
            <div className="text-muted-foreground">Avaliação</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;