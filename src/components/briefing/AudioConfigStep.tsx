import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type SectionType = 'VERSE' | 'CHORUS' | 'INTRO_MONOLOGUE' | 'BRIDGE';
type ModeType = 'keep_exact' | 'light_edit';

const SECTION_OPTIONS = [
  { id: 'VERSE' as const, label: 'Verso', emoji: '🎵', desc: 'Inserir como verso da música' },
  { id: 'CHORUS' as const, label: 'Refrão', emoji: '🔁', desc: 'Inserir como refrão (parte principal)' },
  { id: 'INTRO_MONOLOGUE' as const, label: 'Intro falada', emoji: '🎙️', desc: 'Inserir como monólogo na introdução' },
  { id: 'BRIDGE' as const, label: 'Ponte', emoji: '🌉', desc: 'Inserir como ponte musical' },
];

const MODE_OPTIONS = [
  { id: 'keep_exact' as const, label: 'Manter exatamente', emoji: '📌', desc: 'Usar o texto como foi cantado' },
  { id: 'light_edit' as const, label: 'Ajustar levemente', emoji: '✨', desc: 'Pequenos ajustes de rima e fluidez' },
];

const STYLE_OPTIONS = ['Pop', 'MPB', 'Sertanejo', 'Rock', 'Gospel', 'Pagode', 'Bossa Nova', 'Forró'];

interface AudioConfigStepProps {
  transcript: string;
  section: SectionType | '';
  mode: ModeType | '';
  theme: string;
  style: string;
  isGenerating: boolean;
  generateProgress: number;
  onSectionChange: (section: SectionType) => void;
  onModeChange: (mode: ModeType) => void;
  onThemeChange: (theme: string) => void;
  onStyleChange: (style: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}

export const AudioConfigStep = ({
  transcript,
  section,
  mode,
  theme,
  style,
  isGenerating,
  generateProgress,
  onSectionChange,
  onModeChange,
  onThemeChange,
  onStyleChange,
  onBack,
  onGenerate,
}: AudioConfigStepProps) => {
  const canAdvance = section && mode;

  return (
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
              onClick={() => onSectionChange(opt.id)}
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
              onClick={() => onModeChange(opt.id)}
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
          onChange={(e) => onThemeChange(e.target.value)}
          placeholder="Ex: Feliz aniversário para minha mãe"
        />
      </div>

      {/* Style */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Estilo musical</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map(s => (
            <Badge
              key={s}
              variant={style === s ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onStyleChange(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          className="flex-1"
          onClick={onGenerate}
          disabled={!canAdvance || isGenerating}
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
  );
};

export default AudioConfigStep;
