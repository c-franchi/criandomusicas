import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, ArrowRight, Check, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CustomLyricHighlight = () => {
  const navigate = useNavigate();

  const features = [
    "Use sua própria letra ou poema",
    "Áudio profissional de alta qualidade",
    "Entrega em até 48h na plataforma",
    "Escolha o estilo musical"
  ];

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10" />
      
      {/* Floating decorative elements */}
      <div className="absolute top-10 left-10 animate-float opacity-20" aria-hidden="true">
        <FileText className="w-16 h-16 text-emerald-500" />
      </div>
      <div className="absolute bottom-10 right-10 animate-float opacity-20" style={{ animationDelay: '2s' }} aria-hidden="true">
        <Music className="w-12 h-12 text-teal-500" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl p-8 md:p-12 border border-emerald-500/30 shadow-2xl backdrop-blur-sm">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left side - Content */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500 text-white px-4 py-2 text-sm font-semibold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  NOVIDADE
                </Badge>
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 px-3 py-1">
                  79% OFF
                </Badge>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold">
                Já Tem Sua{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Letra Pronta?
                </span>
              </h2>

              <p className="text-lg text-muted-foreground">
                Transforme sua letra, poema ou texto em uma música profissional. 
                Você escreve, nós produzimos a melodia perfeita!
              </p>

              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-6 text-lg group shadow-lg shadow-emerald-500/25"
                onClick={() => navigate("/briefing?custom_lyric=true")}
              >
                <FileText className="w-5 h-5 mr-2" />
                Usar Minha Letra
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Right side - Price card */}
            <div className="flex justify-center">
              <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 border border-emerald-500/30 shadow-xl text-center max-w-sm w-full">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">Música com Letra Própria</h3>
                
                <div className="my-6">
                  <div className="text-lg text-muted-foreground line-through">
                    R$ 47,90
                  </div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    R$ 9,90
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    pagamento único
                  </p>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Sem taxa adicional
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Qualidade profissional
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomLyricHighlight;
