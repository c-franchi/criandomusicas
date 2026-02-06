import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Mic, FileText, Settings, Sparkles, Loader2, Copy, Check, RotateCcw, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AudioCapture from "./AudioCapture";

type WizardStep = 'capture' | 'transcription' | 'config' | 'result';

interface AudioInsert {
  section: 'VERSE' | 'CHORUS' | 'INTRO_MONOLOGUE' | 'BRIDGE';
  mode: 'keep_exact' | 'light_edit';
  transcript: string;
}

interface AudioModeWizardProps {
  onBack: () => void;
  onComplete?: (lyrics: string) => void;
}

const SECTION_OPTIONS = [
  { id: 'VERSE', label: 'Verso', emoji: '🎵', desc: 'Inserir como verso da música' },
  { id: 'CHORUS', label: 'Refrão', emoji: '🔁', desc: 'Inserir como refrão (parte principal)' },
  { id: 'INTRO_MONOLOGUE', label: 'Intro falada', emoji: '🎙️', desc: 'Inserir como monólogo na introdução' },
  { id: 'BRIDGE', label: 'Ponte', emoji: '🌉', desc: 'Inserir como ponte musical' },
] as const;

const MODE_OPTIONS = [
  { id: 'keep_exact', label: 'Manter exatamente', emoji: '📌', desc: 'Usar o texto como foi cantado' },
  { id: 'light_edit', label: 'Ajustar levemente', emoji: '✨', desc: 'Pequenos ajustes de rima e fluidez' },
] as const;

export const AudioModeWizard = ({ onBack, onComplete }: AudioModeWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('capture');
  const [audioId, setAudioId] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  
  // Transcription
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Config
  const [section, setSection] = useState<AudioInsert['section'] | ''>('');
  const [mode, setMode] = useState<AudioInsert['mode'] | ''>('');
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('Pop');
  
  // Result
  const [finalLyrics, setFinalLyrics] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);

  const steps: { id: WizardStep; label: string; icon: React.ElementType }[] = [
    { id: 'capture', label: 'Áudio', icon: Mic },
    { id: 'transcription', label: 'Transcrição', icon: FileText },
    { id: 'config', label: 'Configurar', icon: Settings },
    { id: 'result', label: 'Resultado', icon: Sparkles },
  ];

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  // ---- Step A: Audio Captured ----
  const handleAudioUploaded = useCallback((id: string, duration: number) => {
    setAudioId(id);
    setAudioDuration(duration);
    setCurrentStep('transcription');
  }, []);

  // ---- Step B: Transcribe ----
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

  // ---- Step D: Generate Lyrics ----
  const handleGenerate = useCallback(async () => {
    if (!transcript || !section || !mode) return;

    setIsGenerating(true);
    setGenerateProgress(0);
    
    // Progress animation
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
          audioInsert: {
            section,
            mode,
            transcript,
          }
        }
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha na geração');

      // Get the first lyric version
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

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(finalLyrics);
    setCopied(true);
    toast.success('Letra copiada!');
    setTimeout(() => setCopied(false), 2000);
  }, [finalLyrics]);

  const canAdvanceFromConfig = section && mode;

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
          {/* Step A: Capture */}
          {currentStep === 'capture' && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Grave ou envie seu áudio</h2>
                <p className="text-sm text-muted-foreground">
                  Cante uma frase curta e clara (3s a 90s). A IA vai transcrever e usar como base da letra.
                </p>
              </div>
              <AudioCapture onAudioUploaded={handleAudioUploaded} />
            </motion.div>
          )}

          {/* Step B: Transcription */}
          {currentStep === 'transcription' && (
            <motion.div
              key="transcription"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Transcrição do áudio</h2>
                <p className="text-sm text-muted-foreground">
                  {transcript 
                    ? 'Revise o texto transcrito. Você pode editar antes de continuar.'
                    : 'Clique para transcrever o áudio enviado.'
                  }
                </p>
              </div>

              {!transcript && !isTranscribing && (
                <div className="flex justify-center">
                  <Button size="lg" onClick={handleTranscribe}>
                    <FileText className="w-5 h-5 mr-2" />
                    Transcrever áudio
                  </Button>
                </div>
              )}

              {isTranscribing && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground animate-pulse">Transcrevendo seu áudio...</p>
                </div>
              )}

              {transcript && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      <Edit3 className="w-3 h-3 mr-1" /> Editável
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Re-transcrever
                    </Button>
                  </div>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={4}
                    placeholder="Texto transcrito aparecerá aqui..."
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Você pode corrigir palavras antes de gerar a letra final.
                  </p>

                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep('config')}>
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step C: Config */}
          {currentStep === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Configure sua música</h2>
                <p className="text-sm text-muted-foreground">
                  Onde inserir o trecho e como usar o texto transcrito.
                </p>
              </div>

              {/* Transcribed text preview */}
              <div className="bg-muted/50 p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Trecho transcrito:</p>
                <p className="text-sm italic">"{transcript}"</p>
              </div>

              {/* Section selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Onde inserir o trecho? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTION_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSection(opt.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        section === opt.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/30 bg-card"
                      )}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <p className="font-medium text-sm mt-1">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Como usar o texto? *</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setMode(opt.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        mode === opt.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/30 bg-card"
                      )}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <p className="font-medium text-sm mt-1">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Tema / Dedicatória (opcional)</label>
                <Input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Ex: Feliz aniversário para minha mãe"
                />
              </div>

              {/* Style */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Estilo musical</label>
                <div className="flex flex-wrap gap-2">
                  {['Pop', 'MPB', 'Sertanejo', 'Rock', 'Gospel', 'Pagode', 'Bossa Nova', 'Forró'].map(s => (
                    <Badge
                      key={s}
                      variant={style === s ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setStyle(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setCurrentStep('transcription')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleGenerate}
                  disabled={!canAdvanceFromConfig || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando letra...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar letra completa
                    </>
                  )}
                </Button>
              </div>

              {/* Generate progress */}
              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={generateProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center animate-pulse">
                    Criando a letra com IA... pode levar até 2 minutos
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Step D: Result */}
          {currentStep === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">🎉 Letra gerada!</h2>
                <p className="text-sm text-muted-foreground">
                  Sua letra está pronta. Copie e cole no Suno para criar a música.
                </p>
              </div>

              {/* Lyrics display */}
              <div className="bg-muted/50 rounded-xl border border-border p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {finalLyrics}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copiar para Suno
                    </>
                  )}
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setCurrentStep('config');
                    setFinalLyrics('');
                  }}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Gerar novamente
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={onBack}>
                    Voltar ao início
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AudioModeWizard;
