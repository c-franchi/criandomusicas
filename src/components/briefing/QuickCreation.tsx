import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, Music, Plus, LayoutGrid, ChevronRight, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ImageCardGrid } from "./ImageCardGrid";
import { genreImages, voiceImages } from "@/assets/briefing";
import { cn } from "@/lib/utils";
import { PreviewBanner } from "@/components/PreviewBanner";

// Preload critical images on module load
const preloadImages = () => {
  const criticalImages = [
    genreImages.pop, genreImages.rock, genreImages.sertanejo,
    genreImages.mpb, genreImages.gospel, genreImages.pagode,
    voiceImages.masculina, voiceImages.feminina, voiceImages.dueto
  ].filter(Boolean);
  
  criticalImages.forEach(src => {
    if (src) {
      const img = new Image();
      img.src = src;
    }
  });
};

// Call preload immediately
preloadImages();

export interface QuickCreationData {
  prompt: string;
  isInstrumental: boolean;
  style: string;
  additionalGenre?: string;
  voiceType?: string;
  songName?: string;
}

interface QuickCreationProps {
  onSubmit: (data: QuickCreationData) => void;
  onBack: () => void;
  onSwitchToDetailed: () => void;
  styleOptions: { id: string; label: string }[];
  voiceOptions: { id: string; label: string }[];
  credits?: number;
  isPreviewMode?: boolean;
}

const QuickCreationComponent = ({ 
  onSubmit, 
  onBack,
  onSwitchToDetailed,
  styleOptions,
  voiceOptions,
  credits = 0,
  isPreviewMode = false
}: QuickCreationProps) => {
  const { t } = useTranslation('briefing');
  const [prompt, setPrompt] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [style, setStyle] = useState("");
  const [additionalGenre, setAdditionalGenre] = useState("");
  const [showAdditionalGenre, setShowAdditionalGenre] = useState(false);
  const [voiceType, setVoiceType] = useState("");
  const [songName, setSongName] = useState("");

  // Map style options with images
  const styleOptionsWithImages = useMemo(() => {
    return styleOptions.slice(0, 15).map(opt => ({
      id: opt.id,
      label: opt.label,
      imageSrc: genreImages[opt.id as keyof typeof genreImages] || genreImages.pop || ''
    }));
  }, [styleOptions]);

  // Map voice options with images (expanded options including children voices)
  const voiceOptionsWithImages = useMemo(() => {
    const expandedVoiceIds = [
      'masculina', 'feminina', 'dueto', 'coral',
      'infantil-masculina', 'infantil-feminina',
      'infantil_masc', 'infantil_fem'
    ];
    return voiceOptions
      .filter(v => expandedVoiceIds.includes(v.id))
      .map(opt => ({
        id: opt.id,
        label: opt.label,
        imageSrc: voiceImages[opt.id as keyof typeof voiceImages] || ''
      }));
  }, [voiceOptions]);

  const handleSubmit = () => {
    if (!prompt.trim() || !style) return;
    
    onSubmit({
      prompt: prompt.trim(),
      isInstrumental,
      style,
      additionalGenre: additionalGenre.trim() || undefined,
      voiceType: isInstrumental ? undefined : voiceType,
      songName: songName.trim() || undefined,
    });
  };

  const handleReset = () => {
    setPrompt("");
    setIsInstrumental(false);
    setStyle("");
    setAdditionalGenre("");
    setShowAdditionalGenre(false);
    setVoiceType("");
    setSongName("");
  };

  const isValid = prompt.trim().length > 10 && style && (isInstrumental || voiceType);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 p-4 border-b border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-foreground">
            {t('quickCreation.pageTitle', 'Crie música com IA')}
          </h1>
          <div className="flex items-center gap-2">
            {credits > 0 && (
              <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
                <Music className="w-3.5 h-3.5" />
                {credits}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Preview Warning Banner */}
          {isPreviewMode && (
            <PreviewBanner variant="warning" showDuration={true} />
          )}

          {/* Prompt Input - Dark Card Style */}
          <div className="bg-card/80 rounded-xl p-4 border border-border/30">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('quickCreation.promptPlaceholder', 'Escreva seu prompt ou letra...')}
              className="min-h-[100px] resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-foreground placeholder:text-muted-foreground"
              maxLength={350}
            />
            
            {/* Controls row */}
            <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('quickCreation.reset', 'Reiniciar')}
              </button>
              
              <span className="text-xs text-muted-foreground tabular-nums">
                {prompt.length}/350
              </span>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('quickCreation.instrumental', 'Instrumental')}
                </span>
                <Switch
                  checked={isInstrumental}
                  onCheckedChange={setIsInstrumental}
                />
              </div>
            </div>
          </div>

          {/* Genre Selection */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                {t('quickCreation.genreTitle', 'Gêneros musicais')}
              </h3>
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            </div>
            <ImageCardGrid
              options={styleOptionsWithImages}
              selectedId={style}
              onSelect={setStyle}
              variant="square"
              showOther={false}
            />
          </section>

          {/* Add Additional Genre */}
          <AnimatePresence>
            {!showAdditionalGenre ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAdditionalGenre(true)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30 hover:bg-card/80 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Plus className="w-4 h-4" />
                  {t('quickCreation.addGenre', 'Adicionar mais gênero')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {additionalGenre ? 1 : 0}
                </span>
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={additionalGenre}
                    onChange={(e) => setAdditionalGenre(e.target.value)}
                    placeholder={t('quickCreation.addGenrePlaceholder', 'Ex: Lo-fi, Funk, K-pop...')}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAdditionalGenre(false);
                      setAdditionalGenre("");
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Type Selection (only if not instrumental) */}
          <AnimatePresence>
            {!isInstrumental && (
              <motion.section 
                className="space-y-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3 className="text-sm font-medium text-foreground">
                  {t('quickCreation.voiceTitle', 'Gênero vocal')}
                </h3>
                <ImageCardGrid
                  options={voiceOptionsWithImages}
                  selectedId={voiceType}
                  onSelect={setVoiceType}
                  variant="square"
                  showOther={false}
                />
              </motion.section>
            )}
          </AnimatePresence>

          {/* Song Name Input (optional) */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              {t('quickCreation.songNameTitle', 'Nome da música')}
              <span className="text-muted-foreground font-normal ml-1">
                {t('quickCreation.optional', '(opcional)')}
              </span>
            </h3>
            <Input
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              placeholder={t('quickCreation.songNamePlaceholder', 'Deixe vazio para gerar automaticamente')}
              className="bg-card/80 border-border/30"
              maxLength={100}
            />
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 p-4 border-t border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full"
            variant="hero"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isPreviewMode 
              ? t('preview.generateButton', 'Gerar Preview')
              : t('quickCreation.createButton', 'Criar Música')}
          </Button>
          
          <button
            onClick={onSwitchToDetailed}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl",
              "bg-gradient-to-r from-primary/15 via-accent/20 to-primary/15",
              "border border-primary/40",
              "shadow-[0_0_15px_rgba(var(--primary-rgb),0.3),inset_0_0_10px_rgba(var(--primary-rgb),0.1)]",
              "hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5),0_0_40px_rgba(var(--accent-rgb),0.3),inset_0_0_15px_rgba(var(--primary-rgb),0.2)]",
              "hover:border-primary/70 hover:from-primary/25 hover:via-accent/30 hover:to-primary/25",
              "transition-all duration-500 group",
              "relative overflow-hidden"
            )}
          >
            {/* Neon glow background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite] pointer-events-none" />
            
            <Palette className="w-4 h-4 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] group-hover:scale-110 transition-transform relative z-10" />
            <span className="text-sm font-medium text-foreground drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.3)] relative z-10">
              {t('quickCreation.switchToDetailed', 'Crie sua música com mais detalhes')}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] px-1.5 py-0.5",
                "border-primary/60 text-primary",
                "shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]",
                "animate-pulse relative z-10"
              )}
            >
              {t('quickCreation.recommended', 'Recomendado')}
            </Badge>
            <ChevronRight className="w-4 h-4 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] group-hover:translate-x-1 transition-transform relative z-10" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const QuickCreation = memo(QuickCreationComponent);
QuickCreation.displayName = 'QuickCreation';

export default QuickCreation;
