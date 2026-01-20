import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, CheckCircle, Music, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Briefing = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Etapa 1 - Tipo de música
    musicType: "",
    
    // Etapa 2 - Emoção/Humor
    emotion: "",
    emotionIntensity: 3,
    
    // Etapa 3 - História
    story: "",
    
    // Etapa 4 - Estrutura
    structure: [] as string[],
    hasMonologue: false,
    monologuePosition: "",
    
    // Etapa 5 - Palavras
    mandatoryWords: "",
    restrictedWords: "",
    
    // Etapa 6 - Preferências técnicas
    style: "",
    customStyle: "",
    rhythm: "",
    atmosphere: "",
    
    // Consentimento
    lgpdConsent: false
  });

  const userPlan = profile?.plan || "free";

  // Restaurar progresso salvo
  useEffect(() => {
    const saved = localStorage.getItem('briefingProgress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.formData) setFormData(parsed.formData);
        if (parsed?.currentStep) setCurrentStep(parsed.currentStep);
      } catch {}
    }
  }, []);

  // Autosave
  useEffect(() => {
    localStorage.setItem('briefingProgress', JSON.stringify({ formData, currentStep }));
  }, [formData, currentStep]);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Tipo", description: "Tipo de música" },
    { number: 2, title: "Emoção", description: "Sentimento principal" },
    { number: 3, title: "História", description: "Conte sua história" },
    { number: 4, title: "Estrutura", description: "Formato da música" },
    { number: 5, title: "Palavras", description: "O que incluir/evitar" },
    { number: 6, title: "Estilo", description: "Preferências técnicas" },
    { number: 7, title: "Revisão", description: "Confirme os dados" }
  ];

  const musicTypes = [
    { id: "homenagem", label: "Homenagem", description: "Para celebrar pessoas especiais" },
    { id: "romantica", label: "Romântica", description: "Declaração de amor" },
    { id: "motivacional", label: "Motivacional", description: "Inspirar e motivar" },
    { id: "infantil", label: "Infantil", description: "Para crianças" },
    { id: "religiosa", label: "Religiosa", description: "Louvor e fé" },
    { id: "parodia", label: "🎭 Paródia / Humor", description: "Zueira e diversão" }
  ];

  const emotions = formData.musicType === "parodia" 
    ? [
        { id: "zoeira", label: "Zoeira Leve" },
        { id: "sarcastico", label: "Sarcástico" },
        { id: "ironico", label: "Irônico" },
        { id: "critica", label: "Crítica Humorada" },
        { id: "absurdo", label: "Absurdo Total" }
      ]
    : [
        { id: "alegria", label: "Alegria" },
        { id: "saudade", label: "Saudade" },
        { id: "gratidao", label: "Gratidão" },
        { id: "amor", label: "Amor" },
        { id: "esperanca", label: "Esperança" },
        { id: "nostalgia", label: "Nostalgia" },
        { id: "superacao", label: "Superação" }
      ];

  const structures = [
    { id: "intro", label: "[Intro]", description: "Abertura instrumental ou vocal" },
    { id: "verse", label: "[Verse]", description: "Versos narrativos" },
    { id: "chorus", label: "[Chorus]", description: "Refrão principal" },
    { id: "bridge", label: "[Bridge]", description: "Ponte/transição" },
    { id: "outro", label: "[Outro]", description: "Encerramento" },
    { id: "monologue", label: "[Monologue]", description: "Trecho falado/declamado" }
  ];

  const monologuePositions = [
    { id: "intro", label: "No início (Intro)" },
    { id: "bridge", label: "Na ponte (Bridge)" },
    { id: "outro", label: "No final (Outro)" }
  ];

  const styles = [
    "Sertanejo", "Pop", "Rock", "MPB", "Rap/Hip-Hop", "Forró",
    "Pagode", "Gospel/Worship", "Bossa Nova", "Funk", "Reggae", "Outro"
  ];

  const rhythms = [
    { id: "lento", label: "Lento", description: "Balada, emocional" },
    { id: "moderado", label: "Moderado", description: "Médio, versátil" },
    { id: "animado", label: "Animado", description: "Rápido, dançante" }
  ];

  const atmospheres = [
    { id: "intimo", label: "Íntimo", description: "Aconchegante, pessoal" },
    { id: "festivo", label: "Festivo", description: "Alegre, celebração" },
    { id: "melancolico", label: "Melancólico", description: "Reflexivo, saudoso" },
    { id: "epico", label: "Épico", description: "Grandioso, impactante" },
    { id: "leve", label: "Leve", description: "Suave, tranquilo" }
  ];

  const toggleStructure = (id: string) => {
    const current = formData.structure;
    if (current.includes(id)) {
      setFormData({ 
        ...formData, 
        structure: current.filter(s => s !== id),
        hasMonologue: id === "monologue" ? false : formData.hasMonologue
      });
    } else {
      setFormData({ 
        ...formData, 
        structure: [...current, id],
        hasMonologue: id === "monologue" ? true : formData.hasMonologue
      });
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.musicType) {
          toast({ title: 'Selecione o tipo de música', variant: 'destructive' });
          return false;
        }
        break;
      case 2:
        if (!formData.emotion) {
          toast({ title: 'Selecione a emoção principal', variant: 'destructive' });
          return false;
        }
        break;
      case 3:
        if (!formData.story.trim() || formData.story.length < 50) {
          toast({ 
            title: 'Conte sua história', 
            description: 'A história deve ter pelo menos 50 caracteres para gerar uma boa letra.',
            variant: 'destructive' 
          });
          return false;
        }
        break;
      case 4:
        if (formData.structure.length < 2) {
          toast({ 
            title: 'Selecione a estrutura', 
            description: 'Escolha pelo menos 2 elementos para a estrutura da música.',
            variant: 'destructive' 
          });
          return false;
        }
        if (formData.hasMonologue && !formData.monologuePosition) {
          toast({ 
            title: 'Posição do monólogo', 
            description: 'Escolha onde o trecho falado deve aparecer.',
            variant: 'destructive' 
          });
          return false;
        }
        break;
      case 6:
        if (!formData.style || (formData.style === 'Outro' && !formData.customStyle.trim())) {
          toast({ title: 'Selecione o estilo musical', variant: 'destructive' });
          return false;
        }
        if (!formData.rhythm) {
          toast({ title: 'Selecione o ritmo', variant: 'destructive' });
          return false;
        }
        if (!formData.atmosphere) {
          toast({ title: 'Selecione a atmosfera', variant: 'destructive' });
          return false;
        }
        break;
      case 7:
        if (!formData.lgpdConsent) {
          toast({ title: 'Aceite os termos para continuar', variant: 'destructive' });
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    if (currentStep < 7) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setSubmitting(true);
    try {
      const briefingData = {
        musicType: formData.musicType,
        emotion: formData.emotion,
        emotionIntensity: formData.emotionIntensity,
        story: formData.story,
        structure: formData.structure,
        hasMonologue: formData.hasMonologue,
        monologuePosition: formData.monologuePosition,
        mandatoryWords: formData.mandatoryWords,
        restrictedWords: formData.restrictedWords,
        style: formData.style === 'Outro' ? formData.customStyle : formData.style,
        rhythm: formData.rhythm,
        atmosphere: formData.atmosphere,
        plan: userPlan,
        lgpdConsent: formData.lgpdConsent
      };

      localStorage.setItem('briefingData', JSON.stringify(briefingData));
      localStorage.removeItem('briefingProgress');
      navigate('/create-song');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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
              <Label className="text-lg font-semibold mb-4 block">Qual tipo de música você quer criar?</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {musicTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={formData.musicType === type.id ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, musicType: type.id, emotion: "" })}
                    className="h-auto p-4 flex flex-col items-start text-left"
                  >
                    <span className="font-semibold">{type.label}</span>
                    <span className="text-xs opacity-70">{type.description}</span>
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
              <Label className="text-lg font-semibold mb-4 block">
                {formData.musicType === "parodia" 
                  ? "Qual tipo de humor você quer?" 
                  : "Qual emoção principal deve transmitir?"}
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {emotions.map((emotion) => (
                  <Button
                    key={emotion.id}
                    variant={formData.emotion === emotion.id ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, emotion: emotion.id })}
                    className="h-auto p-4"
                  >
                    {emotion.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold mb-4 block">
                Intensidade: {formData.emotionIntensity}/5
              </Label>
              <Slider
                value={[formData.emotionIntensity]}
                onValueChange={(value) => setFormData({ ...formData, emotionIntensity: value[0] })}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Sutil</span>
                <span>Moderado</span>
                <span>Intenso</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-2 block">Conte sua história</Label>
              <p className="text-muted-foreground text-sm mb-4">
                Descreva os fatos, momentos especiais, piadas internas, nomes importantes... 
                Quanto mais detalhes, melhor será sua letra!
              </p>
              <Textarea
                placeholder={formData.musicType === "parodia" 
                  ? "Conte a situação engraçada, as piadas internas, os apelidos... Ex: 'Meu amigo João sempre esquece o aniversário da esposa, uma vez ele comprou um aspirador de presente...'"
                  : "Conte sua história com detalhes... Ex: 'Conheci Maria em 2015 na faculdade, ela sempre usava um vestido azul...'"
                }
                value={formData.story}
                onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                rows={8}
                className="w-full resize-none"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{formData.story.length} caracteres</span>
                <span className={formData.story.length < 50 ? "text-destructive" : "text-green-500"}>
                  {formData.story.length < 50 ? `Mínimo: 50 caracteres` : "✓ Tamanho adequado"}
                </span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-4 block">Estrutura da música</Label>
              <p className="text-muted-foreground text-sm mb-4">
                Selecione os elementos que deseja na sua música (mínimo 2)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {structures.map((struct) => (
                  <Button
                    key={struct.id}
                    variant={formData.structure.includes(struct.id) ? "default" : "outline"}
                    onClick={() => toggleStructure(struct.id)}
                    className="h-auto p-4 flex flex-col items-start text-left"
                  >
                    <span className="font-mono font-semibold">{struct.label}</span>
                    <span className="text-xs opacity-70">{struct.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            {formData.hasMonologue && (
              <div className="p-4 bg-accent/20 rounded-lg border border-accent">
                <Label className="font-semibold mb-3 block flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Posição do trecho falado/declamado
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {monologuePositions.map((pos) => (
                    <Button
                      key={pos.id}
                      variant={formData.monologuePosition === pos.id ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, monologuePosition: pos.id })}
                      size="sm"
                    >
                      {pos.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-2 block">Palavras obrigatórias</Label>
              <p className="text-muted-foreground text-sm mb-2">
                Nomes, apelidos, frases que DEVEM aparecer na letra (opcional)
              </p>
              <Textarea
                placeholder="Ex: Maria, amor da minha vida, nosso jardim secreto..."
                value={formData.mandatoryWords}
                onChange={(e) => setFormData({ ...formData, mandatoryWords: e.target.value })}
                rows={3}
                className="w-full resize-none"
              />
            </div>

            <div>
              <Label className="text-lg font-semibold mb-2 block">Palavras/assuntos proibidos</Label>
              <p className="text-muted-foreground text-sm mb-2">
                O que NÃO pode ser mencionado na letra (opcional)
              </p>
              <Textarea
                placeholder="Ex: ex-namorados, dinheiro, trabalho..."
                value={formData.restrictedWords}
                onChange={(e) => setFormData({ ...formData, restrictedWords: e.target.value })}
                rows={3}
                className="w-full resize-none"
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-4 block">Estilo musical</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {styles.map((style) => (
                  <Button
                    key={style}
                    variant={formData.style === style ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, style })}
                    className="h-auto p-3"
                  >
                    {style}
                  </Button>
                ))}
              </div>
              {formData.style === 'Outro' && (
                <Input
                  placeholder="Descreva o estilo desejado..."
                  value={formData.customStyle}
                  onChange={(e) => setFormData({ ...formData, customStyle: e.target.value })}
                  className="mt-4"
                />
              )}
            </div>

            <div>
              <Label className="text-lg font-semibold mb-4 block">Ritmo</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {rhythms.map((rhythm) => (
                  <Button
                    key={rhythm.id}
                    variant={formData.rhythm === rhythm.id ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, rhythm: rhythm.id })}
                    className="h-auto p-4 flex flex-col items-start text-left"
                  >
                    <span className="font-semibold">{rhythm.label}</span>
                    <span className="text-xs opacity-70">{rhythm.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold mb-4 block">Atmosfera</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {atmospheres.map((atm) => (
                  <Button
                    key={atm.id}
                    variant={formData.atmosphere === atm.id ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, atmosphere: atm.id })}
                    className="h-auto p-4 flex flex-col items-start text-left"
                  >
                    <span className="font-semibold">{atm.label}</span>
                    <span className="text-xs opacity-70">{atm.description}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold">Revisão do Pedido</h3>

            <div className="grid gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Tipo de Música</h4>
                <Badge>{musicTypes.find(t => t.id === formData.musicType)?.label || formData.musicType}</Badge>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Emoção</h4>
                <div className="flex gap-2 items-center">
                  <Badge>{emotions.find(e => e.id === formData.emotion)?.label || formData.emotion}</Badge>
                  <span className="text-sm text-muted-foreground">Intensidade: {formData.emotionIntensity}/5</span>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">História</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">{formData.story}</p>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Estrutura</h4>
                <div className="flex gap-2 flex-wrap">
                  {formData.structure.map(s => (
                    <Badge key={s} variant="outline">[{s}]</Badge>
                  ))}
                </div>
                {formData.hasMonologue && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ⚠️ Inclui trecho falado na {formData.monologuePosition}
                  </p>
                )}
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Estilo e Preferências</h4>
                <div className="flex gap-2 flex-wrap">
                  <Badge>{formData.style === 'Outro' ? formData.customStyle : formData.style}</Badge>
                  <Badge variant="outline">{rhythms.find(r => r.id === formData.rhythm)?.label}</Badge>
                  <Badge variant="outline">{atmospheres.find(a => a.id === formData.atmosphere)?.label}</Badge>
                </div>
              </Card>

              {(formData.mandatoryWords || formData.restrictedWords) && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Palavras</h4>
                  {formData.mandatoryWords && (
                    <p className="text-sm"><strong>Incluir:</strong> {formData.mandatoryWords}</p>
                  )}
                  {formData.restrictedWords && (
                    <p className="text-sm text-destructive"><strong>Evitar:</strong> {formData.restrictedWords}</p>
                  )}
                </Card>
              )}

              <Card className="p-4">
                <h4 className="font-semibold mb-2">Seu Plano</h4>
                <Badge variant="secondary">{userPlan.toUpperCase()}</Badge>
              </Card>
            </div>

            <div className="flex items-start space-x-2 p-6 bg-card/50 border border-border rounded-xl">
              <Checkbox
                id="lgpdConsent"
                checked={formData.lgpdConsent}
                onCheckedChange={(checked) => setFormData({ ...formData, lgpdConsent: !!checked })}
                className="mt-0.5"
              />
              <Label htmlFor="lgpdConsent" className="text-sm leading-relaxed">
                <strong className="text-primary">Autorizo o uso dos meus dados</strong> para gerar minha música personalizada conforme a{' '}
                <a href="/privacidade" className="text-primary underline">Política de Privacidade</a>.
                <span className="text-destructive ml-1">*</span>
              </Label>
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Briefing Musical</h1>
          </div>
          <p className="text-muted-foreground">
            Vamos conhecer sua história para criar a música perfeita
          </p>
        </div>

        {/* Progress Steps - Compact */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex justify-between items-center min-w-max gap-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center flex-1 min-w-[60px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm transition-colors ${
                  currentStep >= step.number 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-border bg-background'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <div className="mt-1 text-center">
                  <div className="text-xs font-medium">{step.title}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Progress Bar */}
          <div className="h-1 bg-border rounded-full mt-4">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-primary">
            {steps[currentStep - 1].title}: {steps[currentStep - 1].description}
          </h2>
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

          {currentStep < 7 ? (
            <Button onClick={nextStep} variant="default">
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || !formData.lgpdConsent}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {submitting ? 'Processando...' : 'Gerar Letra da Música'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Briefing;
