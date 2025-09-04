import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, CheckCircle, Music, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Briefing = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [formData, setFormData] = useState({
    occasion: "",
  customOccasion: "",
    style: "",
  customStyle: "",
    tone: "",
    duration: "",
    story: "",
    lgpdConsent: false
  });

  // Buscar plano do usuário
  useEffect(() => {
    // Restaurar progresso salvo do briefing, se existir
    const saved = localStorage.getItem('briefingProgress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.formData) setFormData(parsed.formData);
        if (parsed?.currentStep) setCurrentStep(parsed.currentStep);
      } catch {}
    }

    const fetchUserPlan = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          setUserPlan(userData?.plan || "free");
        } catch (error) {
          console.error("Erro ao buscar plano:", error);
        }
      }
    };
    fetchUserPlan();
  }, [user]);

  // Autosave do formulário a cada mudança
  useEffect(() => {
    localStorage.setItem('briefingProgress', JSON.stringify({ formData, currentStep }));
  }, [formData, currentStep]);

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  const isFree = userPlan === "free";

  const steps = [
    { number: 1, title: "Ocasião", description: "Para que momento é a música?" },
    { number: 2, title: "Preferências", description: "Estilo, tom e duração" },
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

  // Para FREE: só uma opção liberada (será ignorada pelo backend)
  const unlockedStyle = isFree ? "Romântica" : formData.style;
  const unlockedTone = isFree ? "Romântico" : formData.tone;

  const nextStep = () => {
    // Validate required fields for each step
  if (currentStep === 1 && (!formData.occasion || (formData.occasion === 'Outro' && !formData.customOccasion.trim()))) {
      toast({
        title: 'Campo obrigatório',
    description: 'Por favor, selecione uma ocasião e preencha o campo quando escolher "Outro".',
        variant: 'destructive',
      });
      return;
    }
    if (currentStep === 2) {
      if (isFree) {
        // FREE só precisa da duração
        if (!formData.duration) {
          toast({
            title: 'Campo obrigatório',
            description: 'Por favor, defina a duração.',
            variant: 'destructive',
          });
          return;
        }
      } else {
        // Outros planos precisam de tudo
  const styleValid = formData.style && (formData.style !== 'Outro' || !!formData.customStyle.trim());
  if (!styleValid || !formData.tone || !formData.duration) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Por favor, preencha estilo, tom e duração.',
            variant: 'destructive',
          });
          return;
        }
      }
    }
  // Passo 3 não exige mais história; será digitada na tela seguinte (CreateSong)

    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.lgpdConsent) {
      toast({
        title: 'Consentimento necessário',
        description: 'Por favor, aceite os termos para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Redirecionar para CreateSong com os dados do briefing
      const effectiveOccasion = formData.occasion === 'Outro' && formData.customOccasion.trim()
        ? formData.customOccasion.trim()
        : formData.occasion;
      const effectiveStyle = formData.style === 'Outro' && formData.customStyle.trim()
        ? formData.customStyle.trim()
        : formData.style;
      const briefingData = {
        occasion: effectiveOccasion,
        style: isFree ? "preferido" : effectiveStyle, // FREE envia "preferido"
        tone: isFree ? "preferido" : formData.tone,   // FREE envia "preferido"
        durationTargetSec: isFree ? 60 : parseInt(formData.duration) * 60,
        storyRaw: "", // história será digitada na próxima tela
        plan: userPlan,
        lgpdConsent: formData.lgpdConsent
      };

      // Salvar no localStorage para passar para CreateSong
      localStorage.setItem('briefingData', JSON.stringify(briefingData));

  // Limpa progresso salvo para começar a geração
  localStorage.removeItem('briefingProgress');
  // Redirecionar para CreateSong
      window.location.href = '/create-song';

    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
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
              {formData.occasion === 'Outro' && (
                <div className="mt-4">
                  <Label htmlFor="customOccasion">Descreva a ocasião</Label>
                  <Input
                    id="customOccasion"
                    placeholder="Ex: Bodas de Prata, Pedido de Namoro..."
                    value={formData.customOccasion}
                    onChange={(e) => setFormData({ ...formData, customOccasion: e.target.value })}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-4 block">Qual estilo musical você prefere?</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {styles.map((style) => {
                  const isDisabled = isFree && style !== unlockedStyle;
                  return (
                    <Button
                      key={style}
                      variant={formData.style === style ? "default" : "outline"}
                      onClick={() => !isDisabled && setFormData({ ...formData, style })}
                      className={`h-auto p-4 text-left justify-start relative ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isDisabled}
                    >
                      {style}
                      {isDisabled && <Lock className="w-4 h-4 absolute top-2 right-2" />}
                    </Button>
                  );
                })}
              </div>
              {formData.style === 'Outro' && !isFree && (
                <div className="mt-2">
                  <Label htmlFor="customStyle">Descreva o estilo</Label>
                  <Input
                    id="customStyle"
                    placeholder="Ex: Folk romântico, Samba, Bossa..."
                    value={formData.customStyle}
                    onChange={(e) => setFormData({ ...formData, customStyle: e.target.value })}
                    className="mt-2"
                  />
                </div>
              )}
              {isFree && (
                <p className="text-sm text-muted-foreground mb-4">
                  Plano Free: O estilo será escolhido automaticamente baseado na sua história.
                </p>
              )}
            </div>

            <div>
              <Label className="text-lg font-semibold mb-4 block">Qual o tom da música?</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {tones.map((tone) => {
                  const isDisabled = isFree && tone !== unlockedTone;
                  return (
                    <Button
                      key={tone}
                      variant={formData.tone === tone ? "default" : "outline"}
                      onClick={() => !isDisabled && setFormData({ ...formData, tone })}
                      className={`h-auto p-4 text-left justify-start relative ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isDisabled}
                    >
                      {tone}
                      {isDisabled && <Lock className="w-4 h-4 absolute top-2 right-2" />}
                    </Button>
                  );
                })}
              </div>
              {isFree && (
                <p className="text-sm text-muted-foreground mb-4">
                  Plano Free: O tom será escolhido automaticamente baseado na sua história.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="duration" className="text-lg font-semibold">Duração aproximada (minutos)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Ex: 3"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="mt-2"
                min="1"
                max={isFree ? "1" : "10"}
                disabled={isFree}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {isFree ? "até 1 minuto" : "Entre 1 e 10 minutos"}
              </p>
              {isFree && (
                <p className="text-xs text-muted-foreground mt-1">
                  Plano Free: Duração limitada a 1 minuto.
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold">História</Label>
              <p className="text-muted-foreground mt-2">
                A sua história será escrita na próxima etapa, na tela "Criar Música". Lá você poderá usar modelos prontos ou digitar livremente.
              </p>
            </div>

            <div className="flex items-start space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Checkbox
                id="lgpdConsent"
                checked={formData.lgpdConsent}
                onCheckedChange={(checked) => setFormData({ ...formData, lgpdConsent: !!checked })}
              />
              <Label htmlFor="lgpdConsent" className="text-sm font-medium">
                <strong>Autorizo o uso dos meus dados</strong> para gerar minha música personalizada conforme a{' '}
                <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>.
                <span className="text-red-500 ml-1">*</span>
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
                {isFree ? (
                  <div className="text-sm text-muted-foreground">
                    <p>Estilo: <strong>Escolhido automaticamente</strong></p>
                    <p>Tom: <strong>Escolhido automaticamente</strong></p>
                    <p className="text-xs mt-2">Baseado na sua história</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Badge>{formData.style === 'Outro' && formData.customStyle ? formData.customStyle : formData.style}</Badge>
                    <Badge variant="outline">{formData.tone}</Badge>
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Duração</h4>
                <Badge variant="secondary">
                  {isFree ? "até 1 minuto" : `${formData.duration} minutos`}
                </Badge>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">História</h4>
                <p className="text-muted-foreground text-sm">Será preenchida na próxima etapa (Criar Música).</p>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Seu Plano</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={isFree ? "secondary" : "default"}>
                    {isFree ? "FREE" : userPlan.toUpperCase()}
                  </Badge>
                  {isFree && (
                    <span className="text-xs text-muted-foreground">
                      1 música • 2 versões • até 1 min
                    </span>
                  )}
                </div>
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
            <Button
              variant="hero"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || !formData.lgpdConsent}
            >
              {submitting ? 'Processando...' : 'Criar Minha Música'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Briefing;