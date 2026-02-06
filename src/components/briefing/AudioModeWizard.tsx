import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, FileText, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AudioCapture from "./AudioCapture";
import { AudioTranscriptionStep } from "./AudioTranscriptionStep";
import { AudioConfigStep } from "./AudioConfigStep";
import { AudioResultStep } from "./AudioResultStep";

type WizardStep = 'capture' | 'transcription' | 'config' | 'result';
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
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Config
  const [section, setSection] = useState<SectionType | ''>('');
  const [mode, setMode] = useState<ModeType | ''>('');
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('Pop');

  // Result
  const [finalLyrics, setFinalLyrics] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);

  const steps: { id: WizardStep; label: string; icon: React.ElementType }[] = [
    { id: 'capture', label: 'Áudio', icon: Mic },
    { id: 'transcription', label: 'Transcrição', icon: FileText },
    { id: 'config', label: 'Configurar', icon: Settings },
    { id: 'result', label: 'Resultado', icon: Sparkles },
  ];

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  const handleAudioUploaded = useCallback((id: string, _duration: number) => {
    setAudioId(id);
    setCurrentStep('transcription');
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!audioId) return;
    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio_id: audioId, language: 'pt' },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha na transcrição');
      setTranscript(data.transcript);
      toast.success('Transcrição concluída!');
    } catch (error: unknown) {
      console.error('Transcription error:', error);
      const msg = error instanceof Error ? error.message : 'Erro na transcrição';
      toast.error('Falha na transcrição', { description: msg });
    } finally {
      setIsTranscribing(false);
    }
  }, [audioId]);

  const handleGenerate = useCallback(async () => {
    if (!transcript || !section || !mode) return;
    setIsGenerating(true);
    setGenerateProgress(0);

    const interval = setInterval(() => {
      setGenerateProgress(prev => Math.min(prev + 1.5, 95));
    }, 1000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: {
          story: theme || `Música com o trecho: "${transcript}"`,
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
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha na geração');

      const lyricText = data.lyrics?.[0]?.text || data.lyrics?.[0]?.body || '';
      setFinalLyrics(lyricText);
      setCurrentStep('result');
      toast.success('Letra gerada com sucesso!');
    } catch (error: unknown) {
      console.error('Generate error:', error);
      const msg = error instanceof Error ? error.message : 'Erro na geração';
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
                  <step.icon className="w-3.5 h-3.5" />
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
                  Cante uma frase curta e clara (3s a 90s). A IA vai transcrever e usar como base da letra.
                </p>
              </div>
              <AudioCapture onAudioUploaded={handleAudioUploaded} />
            </div>
          )}

          {currentStep === 'transcription' && (
            <AudioTranscriptionStep
              transcript={transcript}
              isTranscribing={isTranscribing}
              onTranscribe={handleTranscribe}
              onTranscriptChange={setTranscript}
              onNext={() => setCurrentStep('config')}
            />
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
              onBack={() => setCurrentStep('transcription')}
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
