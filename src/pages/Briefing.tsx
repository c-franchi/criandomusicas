import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle, Music } from "lucide-react";

const Briefing = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    occasion: "",
    style: "",
    tone: "",
    duration: "",
    story: "",
    names: "",
    consent: false
  });

  const steps = [
    { number: 1, title: "Ocasião", description: "Para que momento é a música?" },
    { number: 2, title: "Estilo", description: "Qual o estilo musical?" },
    { number: 3, title: "História", description: "Conte sua história" },
    { number: 4, title: "Revisão", description: "Confirme os dados" }
  ];

  const occasions = [
    "Aniversário", "Casamento", "Formatura", "Empresa", "Igreja", 
    "Dia das Mães", "Dia dos Pais", "Natal", "Outro"
  ];

  const styles = [
    "Sertanejo", "Pop", "Rock", "Worship", "Rap", "MPB", 
    "Forró", "Romântica", "Infantil", "Outro"
  ];

  const tones = [
    "Emocionante", "Divertido", "Épico", "Romântico", 
    "Inspirador", "Nostálgico", "Energético"
  ];

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-4 block">Para qual ocasião é a música?</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {occasions.map((occasion) => (
                  <Button
                    key={occasion}
                    variant={formData.occasion === occasion ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, occasion })}
                    className="h-auto p-4 text-left justify-start"
                  >
                    {occasion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-4 block">Qual estilo musical você prefere?</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {styles.map((style) => (
                  <Button
                    key={style}
                    variant={formData.style === style ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, style })}
                    className="h-auto p-4 text-left justify-start"
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold mb-4 block">Qual o tom da música?</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {tones.map((tone) => (
                  <Button
                    key={tone}
                    variant={formData.tone === tone ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, tone })}
                    className="h-auto p-4 text-left justify-start"
                  >
                    {tone}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="duration" className="text-lg font-semibold">Duração aproximada (segundos)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Ex: 180 (3 minutos)"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="story" className="text-lg font-semibold">Conte sua história</Label>
              <p className="text-muted-foreground mb-4">
                Quanto mais detalhes, melhor será a letra. Conte sobre pessoas, momentos, sentimentos...
              </p>
              <Textarea
                id="story"
                placeholder="Era uma vez... Conte todos os detalhes da sua história especial."
                value={formData.story}
                onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                className="min-h-40"
              />
            </div>

            <div>
              <Label htmlFor="names" className="text-lg font-semibold">Nomes importantes</Label>
              <p className="text-muted-foreground mb-2">
                Nomes de pessoas que devem aparecer na música (opcional)
              </p>
              <Input
                id="names"
                placeholder="Ex: Maria, João, Ana..."
                value={formData.names}
                onChange={(e) => setFormData({ ...formData, names: e.target.value })}
              />
            </div>

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="consent"
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-sm">
                Autorizo o uso dos meus dados para gerar minha música personalizada conforme a 
                <a href="/privacidade" className="text-primary hover:underline ml-1">Política de Privacidade</a>.
              </Label>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold">Revisão do Pedido</h3>
            
            <div className="grid gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Ocasião</h4>
                <Badge>{formData.occasion}</Badge>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Estilo e Tom</h4>
                <div className="flex gap-2">
                  <Badge>{formData.style}</Badge>
                  <Badge variant="outline">{formData.tone}</Badge>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">História</h4>
                <p className="text-muted-foreground text-sm">
                  {formData.story.slice(0, 200)}...
                </p>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Investimento</h4>
                <div className="text-2xl font-bold gradient-text">R$ 97</div>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Briefing Musical</h1>
          </div>
          <p className="text-muted-foreground">
            Vamos conhecer sua história para criar a música perfeita
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex justify-between items-center relative">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  currentStep >= step.number 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-border bg-background'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </div>
            ))}
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 mb-8">
          {renderStep()}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep < 4 ? (
            <Button onClick={nextStep} variant="hero">
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button variant="hero" size="lg">
              Finalizar Pedido
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Briefing;