import { Video, Image, Play, Sparkles, ArrowRight, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "5516997310587";

const VideoServiceSection = () => {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-background to-primary/5">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Video className="w-3 h-3 mr-1" />
            Serviço Adicional
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Transforme sua música em <span className="text-primary">vídeo</span> 🎬
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Além da música, você pode receber um vídeo personalizado, 
            pronto para compartilhar e emocionar ainda mais.
          </p>
        </div>

        {/* Single Price Card */}
        <Card className="border-2 border-primary max-w-2xl mx-auto mb-8">
          <CardContent className="pt-8 pb-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Vídeo Personalizado</h3>
              <div className="bg-primary/10 rounded-lg py-4 px-6 inline-block mb-4">
                <span className="text-sm text-muted-foreground">a partir de</span>
                <span className="text-4xl font-bold text-primary ml-2">R$ 50</span>
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Escolha uma das opções abaixo para criar seu vídeo com edição profissional
              </p>
            </div>

            {/* Options */}
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/50 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Image className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">5 Imagens</h4>
                <p className="text-sm text-muted-foreground">
                  Slideshow com transições suaves
                </p>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/50 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Image className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">10 Imagens</h4>
                <p className="text-sm text-muted-foreground">
                  Mais fotos, mais memórias
                </p>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/50 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Play className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">1 Vídeo de 2 min</h4>
                <p className="text-sm text-muted-foreground">
                  Edição completa do seu vídeo
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Edição profissional com efeitos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Transições cinematográficas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Sincronização com a música</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Entrega em até 48h</span>
              </div>
            </div>

            {/* Loop Notice */}
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-accent">Músicas mais longas?</p>
                <p className="text-sm text-muted-foreground">
                  Caso sua música seja maior que o conteúdo enviado, as imagens ficarão em <strong>loop</strong> até o final da música, criando uma experiência visual contínua.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Disponível para qualquer pessoa — com ou sem música criada na plataforma
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="group">
              <Link to="/auth">
                Quero minha música em vídeo
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <a 
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Gostaria de saber sobre outros planos de vídeo personalizados.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Outros planos de vídeo
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Projetos especiais? Fale conosco pelo WhatsApp para orçamentos personalizados
          </p>
        </div>
      </div>
    </section>
  );
};

export default VideoServiceSection;
