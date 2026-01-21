import { Video, Image, Play, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const VideoServiceSection = () => {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-background to-primary/5">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Video className="w-3 h-3 mr-1" />
            Novo Serviço
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Transforme Sua Música em <span className="text-primary">Vídeo</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Crie vídeos personalizados com fotos ou clipes usando a música que você criou na plataforma. 
            Presente perfeito para datas especiais!
          </p>
        </div>

        {/* Video Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Option 1 */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">5 Fotos + Áudio</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Vídeo com slideshow de até 5 fotos sincronizado com sua música
                </p>
                <div className="bg-muted/50 rounded-lg p-3 mb-4">
                  <span className="text-2xl font-bold text-primary">R$ 50</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Transições suaves
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Efeitos visuais
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Entrega em 48h
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Option 2 */}
          <Card className="border-2 border-primary relative hover:shadow-xl transition-all duration-300">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">Mais Popular</Badge>
            </div>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Image className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">8 Fotos + 1 Vídeo</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Combine 8 fotos com 1 vídeo de até 1 minuto
                </p>
                <div className="bg-primary/10 rounded-lg p-3 mb-4">
                  <span className="text-2xl font-bold text-primary">R$ 50</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Edição profissional
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Efeitos cinematográficos
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Entrega em 48h
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Option 3 */}
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Vídeo de 2 min</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Envie um vídeo de até 2 minutos para edição completa
                </p>
                <div className="bg-muted/50 rounded-lg p-3 mb-4">
                  <span className="text-2xl font-bold text-primary">R$ 50</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Corte e edição
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Sincronização com música
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Entrega em 48h
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Disponível para clientes que já criaram sua música na plataforma
          </p>
          <Button asChild size="lg" className="group">
            <Link to="/dashboard">
              Acessar Meu Painel
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default VideoServiceSection;
