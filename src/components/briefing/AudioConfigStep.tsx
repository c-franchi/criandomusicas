import { useTranslation } from 'react-i18next';
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

const STYLE_OPTIONS = ["Pop", "MPB", "Sertanejo Raiz", "Sertanejo Universitário", "Rock", "Gospel", "Pagode", "Bossa Nova", "Forró", "Reggae"];

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
  const { t: tb } = useTranslation('uiBriefing');
  const SECTION_OPTIONS = [
    { id: "VERSE" as const, label: tb('text065'), emoji: "🎵", desc: tb('text066') },
    { id: "CHORUS" as const, label: tb('text067'), emoji: "🔁", desc: tb('text068') },
    { id: "INTRO_MONOLOGUE" as const, label: tb('text069'), emoji: "🎙️", desc: tb('text070') },
    { id: "BRIDGE" as const, label: tb('text071'), emoji: "🌉", desc: tb('text072') },
  ];

  const MODE_OPTIONS = [
    { id: "keep_exact" as const, label: tb('text073'), emoji: "📌", desc: tb('text074') },
    { id: "light_edit" as const, label: tb('text075'), emoji: "✨", desc: tb('text076') },
  ];


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
        <h2 className="text-xl font-bold">{tb('text077')}</h2>
        <p className="text-sm text-muted-foreground">{tb('text078')}</p>
      </div>

      {/* Transcribed text - editable */}
      <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">{tb('text079')}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setIsEditingTranscript(!isEditingTranscript)}
          >
            <Edit3 className="w-3 h-3" />
            {isEditingTranscript ? tb('text080') : tb('text081')}
          </Button>
        </div>
        {isEditingTranscript ? (
          <div className="space-y-1">
            <Textarea
              value={transcript}
              onChange={(e) => onTranscriptChange?.(e.target.value)}
              rows={4}
              className="text-sm"
              placeholder={tb('text082')}
            />
            <p className="text-xs text-muted-foreground">
              {tb('text083')}
            </p>
          </div>
        ) : (
          <p className="text-sm italic">"{transcript}"</p>
        )}
      </div>

      {/* Section selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">{tb('text084')}</label>
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
        <label className="text-sm font-semibold">{tb('text085')}</label>
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
        <label className="text-sm font-semibold">{tb('text086')}</label>
        <div className="flex gap-2">
          <Badge
            variant={voiceType === "female" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onVoiceTypeChange("female")}
          >
            {tb('text087')}
          </Badge>

          <Badge
            variant={voiceType === "male" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onVoiceTypeChange("male")}
          >
            {tb('text088')}
          </Badge>
        </div>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">{tb('text089')}</label>
        <Input
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          placeholder={tb('text090')}
        />
      </div>

      {/* Song Name */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">{tb('text091')}</label>
        <Input
          value={songName || ""}
          onChange={(e) => onSongNameChange?.(e.target.value)}
          placeholder={tb('text092')}
        />
      </div>

      {/* Style */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">{tb('text093')}</label>
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
            {tb('text094')}
          </Badge>
        </div>
        {(style === "__custom__" || (style !== "" && !STYLE_OPTIONS.includes(style) && style !== "__custom__")) && (
          <Input
            value={style === "__custom__" ? "" : style}
            onChange={(e) => onStyleChange(e.target.value || "__custom__")}
            placeholder={tb('text095')}
            className="mt-2"
            autoFocus
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {tb('text096')}
        </Button>
        <Button className="flex-1" onClick={onGenerate} disabled={!canAdvance || isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {tb('text097')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {tb('text098')}
            </>
          )}
        </Button>
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <Progress value={generateProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center animate-pulse">
            {tb('text099')}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default AudioConfigStep;
