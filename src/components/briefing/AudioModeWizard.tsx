import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mic, Settings, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AudioCapture from "./AudioCapture";
import { AudioConfigStep } from "./AudioConfigStep";
import { AudioResultStep } from "./AudioResultStep";

type WizardStep = 'capture' | 'transcribing' | 'config' | 'result';
type SectionType = 'VERSE' | 'CHORUS' | 'INTRO_MONOLOGUE' | 'BRIDGE';
type ModeType = 'keep_exact' | 'light_edit';

interface AudioModeWizardProps {
  onBack: () => void;
  onComplete?: (lyrics: string) => void;
}

export const AudioModeWizard = ({ onBack, onComplete }: AudioModeWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('capture');
  const [audioId, setAudioId] = useState<string | null>(null);

  // Transcription
  const [transcript, setTranscript] = useState('');

  // Config
  const [section, setSection] = useState<SectionType | ''>('');
  const [mode, setMode] = useState<ModeType>('light_edit');
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('Pop');

  // Result
  const [finalLyrics, setFinalLyrics] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);

  const steps: { id: WizardStep; label: string; icon: React.ElementType }[] = [
    { id: 'capture', label: 'Áudio', icon: Mic },
    { id: 'transcribing', label: 'Transcrevendo', icon: Loader2 },
    { id: 'config', label: 'Configurar', icon: Settings },
    { id: 'result', label: 'Resultado', icon: Sparkles },
  ];

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  // Auto-transcribe when audio is uploaded
  const handleAudioUploaded = useCallback((id: string, _duration: number) => {
    setAudioId(id);
    setCurrentStep('transcribing');
  }, []);

  // Auto-transcribe effect
  useEffect(() => {
    if (currentStep !== 'transcribing' || !audioId) return;

    let cancelled = false;

    const transcribe = async () => {
      try {
        console.log('[AudioWizard] Auto-transcribing audio:', audioId);
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio_id: audioId, language: 'pt' },
        });
        if (cancelled) return;
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || 'Falha na transcrição');

        setTranscript(data.transcript);
        toast.success('Transcrição concluída!');
        setCurrentStep('config');
      } catch (error: unknown) {
        if (cancelled) return;
        console.error('Transcription error:', error);
        const msg = error instanceof Error ? error.message : 'Erro na transcrição';
        toast.error('Falha na transcrição', { description: msg });
        // Go back to capture so user can retry
        setCurrentStep('capture');
        setAudioId(null);
      }
    };

    transcribe();

    return () => { cancelled = true; };
  }, [currentStep, audioId]);

  const handleGenerate = useCallback(async () => {
    if (!transcript || !section) {
      toast.error('Selecione a posição do trecho na música');
      return;
    }
    setIsGenerating(true);
    setGenerateProgress(0);

    const interval = setInterval(() => {
      setGenerateProgress(prev => Math.min(prev + 1.5, 95));
    }, 1000);

    try {
      const storyText = theme 
        ? `${theme}. O usuário cantou/gravou o seguinte trecho: "${transcript}"`
        : `Música baseada no trecho cantado/gravado pelo usuário: "${transcript}"`;

      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: {
          // No orderId = standalone mode
          story: storyText,
          briefing: {
            musicType: 'homenagem',
            emotion: 'alegria',
            emotionIntensity: 3,
            style: style.toLowerCase(),
            rhythm: 'moderado',
            atmosphere: 'festivo',
            structure: ['verse', 'chorus', 'verse', 'chorus', 'outro'],
            hasMonologue: section === 'INTRO_MONOLOGUE',
            monologuePosition: section === 'INTRO_MONOLOGUE' ? 'intro' : '',
            mandatoryWords: mode === 'keep_exact' ? transcript : '',
            restrictedWords: '',
            songName: '',
            autoGenerateName: true,
          },
          audioInsert: { section, mode, transcript },
          isPreview: true,
        },
      });

      if (error) {
        const errorStr = String(error?.message || error || '');
        
        if (errorStr.includes('429') || errorStr.includes('rate limit')) {
          throw new Error('Muitas requisições. Aguarde alguns minutos e tente novamente.');
        }
        if (errorStr.includes('402') || errorStr.includes('payment')) {
          throw new Error('Créditos de IA insuficientes. Entre em contato com o suporte.');
        }
        throw new Error(errorStr || 'Falha na geração da letra');
      }
      
      if (!data?.ok) {
        throw new Error(data?.error || 'Falha na geração');
      }

      const lyricText = data.lyrics?.[0]?.text || data.lyrics?.[0]?.body || '';
      if (!lyricText) {
        throw new Error('A IA retornou uma resposta vazia. Tente novamente.');
      }

      setFinalLyrics(lyricText);
      setCurrentStep('result');
      toast.success('Letra gerada com sucesso!');
    } catch (error: unknown) {
      console.error('Generate error:', error);
      const msg = error instanceof Error ? error.message : 'Erro na geração da letra';
      toast.error('Falha ao gerar letra', { description: msg });
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
      setGenerateProgress(0);
    }
  }, [transcript, section, mode, theme, style]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-bold">🎤 Criar por Áudio</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                  idx < stepIndex ? "text-primary" :
                  idx === stepIndex ? "bg-primary text-primary-foreground" :
                  "text-muted-foreground"
                )}>
                  <step.icon className={cn("w-3.5 h-3.5", idx === stepIndex && step.id === 'transcribing' && "animate-spin")} />
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-1 rounded-full",
                    idx < stepIndex ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentStep === 'capture' && (
            <div key="capture" className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Grave ou envie seu áudio</h2>
                <p className="text-sm text-muted-foreground">
                  Cante uma frase curta e clara (3s a 90s). Após enviar, a IA vai transcrever automaticamente.
                </p>
              </div>
              <AudioCapture onAudioUploaded={handleAudioUploaded} />
            </div>
          )}

          {currentStep === 'transcribing' && (
            <motion.div
              key="transcribing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 py-16"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Transcrevendo seu áudio...</h2>
                <p className="text-sm text-muted-foreground">
                  A IA está ouvindo e convertendo em texto. Aguarde alguns segundos.
                </p>
              </div>
              <Progress value={50} className="h-2 w-48 animate-pulse" />
            </motion.div>
          )}

          {currentStep === 'config' && (
            <AudioConfigStep
              transcript={transcript}
              section={section}
              mode={mode}
              theme={theme}
              style={style}
              isGenerating={isGenerating}
              generateProgress={generateProgress}
              onSectionChange={setSection}
              onModeChange={setMode}
              onThemeChange={setTheme}
              onStyleChange={setStyle}
              onBack={() => {
                setCurrentStep('capture');
                setAudioId(null);
                setTranscript('');
              }}
              onGenerate={handleGenerate}
            />
          )}

          {currentStep === 'result' && (
            <AudioResultStep
              lyrics={finalLyrics}
              onRegenerate={() => {
                setCurrentStep('config');
                setFinalLyrics('');
              }}
              onBack={onBack}
              onComplete={onComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AudioModeWizard;
