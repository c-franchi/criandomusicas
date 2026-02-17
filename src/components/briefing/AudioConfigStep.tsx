import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type SectionType = "VERSE" | "CHORUS" | "INTRO_MONOLOGUE" | "BRIDGE";
type ModeType = "keep_exact" | "light_edit";
type VoiceType = "male" | "female"; // ✅ NOVO

const SECTION_OPTIONS = [
  { id: "VERSE" as const, label: "Verso", emoji: "🎵", desc: "Inserir como verso da música" },
  { id: "CHORUS" as const, label: "Refrão", emoji: "🔁", desc: "Inserir como refrão (parte principal)" },
  { id: "INTRO_MONOLOGUE" as const, label: "Intro falada", emoji: "🎙️", desc: "Inserir como monólogo na introdução" },
  { id: "BRIDGE" as const, label: "Ponte", emoji: "🌉", desc: "Inserir como ponte musical" },
];

const MODE_OPTIONS = [
  { id: "keep_exact" as const, label: "Manter exatamente", emoji: "📌", desc: "Usar o texto como foi cantado" },
  { id: "light_edit" as const, label: "Ajustar levemente", emoji: "✨", desc: "Pequenos ajustes de rima e fluidez" },
];

const STYLE_OPTIONS = ["Pop", "MPB", "Sertanejo", "Rock", "Gospel", "Pagode", "Bossa Nova", "Forró", "Reggae"];

interface AudioConfigStepProps {
  transcript: string;
  section: SectionType | "";
  mode: ModeType | "";
  voiceType: VoiceType | "";
  theme: string;
  style: string;
  songName?: string;
  isGenerating: boolean;
  generateProgress: number;
  onSectionChange: (section: SectionType) => void;
  onModeChange: (mode: ModeType) => void;
  onVoiceTypeChange: (voice: VoiceType) => void;
  onTranscriptChange?: (transcript: string) => void;
  onThemeChange: (theme: string) => void;
  onStyleChange: (style: string) => void;
  onSongNameChange?: (name: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}

export const AudioConfigStep = ({
  transcript,
  section,
  mode,
  voiceType,
  theme,
  style,
  songName,
  isGenerating,
  generateProgress,
  onSectionChange,
  onModeChange,
  onVoiceTypeChange,
  onTranscriptChange,
  onThemeChange,
  onStyleChange,
  onSongNameChange,
  onBack,
  onGenerate,
}: AudioConfigStepProps) => {
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const canAdvance = section && mode && voiceType;

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
        <p className="text-sm text-muted-foreground">Onde inserir o trecho e como usar o texto transcrito.</p>
      </div>

      {/* Transcribed text - editable */}
      <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">Trecho transcrito:</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setIsEditingTranscript(!isEditingTranscript)}
          >
            <Edit3 className="w-3 h-3" />
            {isEditingTranscript ? "Fechar" : "Editar"}
          </Button>
        </div>
        {isEditingTranscript ? (
          <div className="space-y-1">
            <Textarea
              value={transcript}
              onChange={(e) => onTranscriptChange?.(e.target.value)}
              rows={4}
              className="text-sm"
              placeholder="Edite a transcrição aqui..."
            />
            <p className="text-xs text-muted-foreground">
              💡 Corrija erros de transcrição antes de gerar a letra. Isso evita gastar créditos com resultados incorretos.
            </p>
          </div>
        ) : (
          <p className="text-sm italic">"{transcript}"</p>
        )}
      </div>

      {/* Section selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Onde inserir o trecho? *</label>
        <div className="grid grid-cols-2 gap-2">
          {SECTION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSectionChange(opt.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                section === opt.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30 bg-card",
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
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onModeChange(opt.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                mode === opt.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30 bg-card",
              )}
            >
              <span className="text-lg">{opt.emoji}</span>
              <p className="font-medium text-sm mt-1">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 🎤 VOICE SELECTION (NOVO BLOCO) */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Tipo de voz desejada *</label>
        <div className="flex gap-2">
          <Badge
            variant={voiceType === "female" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onVoiceTypeChange("female")}
          >
            🎙️ Feminina
          </Badge>

          <Badge
            variant={voiceType === "male" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onVoiceTypeChange("male")}
          >
            🎙️ Masculina
          </Badge>
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

      {/* Song Name */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Nome da música (opcional)</label>
        <Input
          value={songName || ""}
          onChange={(e) => onSongNameChange?.(e.target.value)}
          placeholder="Deixe vazio para gerar automaticamente"
        />
      </div>

      {/* Style */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Estilo musical</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((s) => (
            <Badge
              key={s}
              variant={style === s ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                onStyleChange(s);
              }}
            >
              {s}
            </Badge>
          ))}
          <Badge
            variant={style !== "" && !STYLE_OPTIONS.includes(style) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onStyleChange("__custom__")}
          >
            Outro
          </Badge>
        </div>
        {(style === "__custom__" || (style !== "" && !STYLE_OPTIONS.includes(style) && style !== "__custom__")) && (
          <Input
            value={style === "__custom__" ? "" : style}
            onChange={(e) => onStyleChange(e.target.value || "__custom__")}
            placeholder="Digite o estilo musical desejado"
            className="mt-2"
            autoFocus
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button className="flex-1" onClick={onGenerate} disabled={!canAdvance || isGenerating}>
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
