import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw, Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImageCardGrid } from "./ImageCardGrid";
import { genreImages, voiceImages } from "@/assets/briefing";
import { cn } from "@/lib/utils";

export interface QuickCreationData {
  prompt: string;
  isInstrumental: boolean;
  style: string;
  voiceType?: string;
}

interface QuickCreationProps {
  onSubmit: (data: QuickCreationData) => void;
  onBack: () => void;
  onSwitchToDetailed: () => void;
  styleOptions: { id: string; label: string }[];
  voiceOptions: { id: string; label: string }[];
}

export const QuickCreation = ({ 
  onSubmit, 
  onBack,
  onSwitchToDetailed,
  styleOptions,
  voiceOptions 
}: QuickCreationProps) => {
  const { t } = useTranslation('briefing');
  const [prompt, setPrompt] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [style, setStyle] = useState("");
  const [voiceType, setVoiceType] = useState("");

  // Map style options with images
  const styleOptionsWithImages = useMemo(() => {
    return styleOptions.slice(0, 12).map(opt => ({
      id: opt.id,
      label: opt.label,
      imageSrc: genreImages[opt.id as keyof typeof genreImages] || genreImages.pop || ''
    }));
  }, [styleOptions]);

  // Map voice options with images (only simple options)
  const voiceOptionsWithImages = useMemo(() => {
    const simpleVoiceIds = ['masculina', 'feminina', 'dueto'];
    return voiceOptions
      .filter(v => simpleVoiceIds.includes(v.id))
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
      voiceType: isInstrumental ? undefined : voiceType,
    });
  };

  const handleReset = () => {
    setPrompt("");
    setIsInstrumental(false);
    setStyle("");
    setVoiceType("");
  };

  const isValid = prompt.trim().length > 10 && style && (isInstrumental || voiceType);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <button 
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t('chat.back')}
        </button>
        <h2 className="font-semibold text-foreground">
          {t('quickCreation.title')}
        </h2>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('quickCreation.promptLabel')} *
          </Label>
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('quickCreation.promptPlaceholder')}
              className="min-h-[120px] resize-none pr-16"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {prompt.length}/500
            </span>
          </div>
          
          {/* Controls row */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('quickCreation.reset')}
            </button>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="instrumental-toggle" className="text-sm text-muted-foreground">
                {t('quickCreation.instrumental')}
              </Label>
              <Switch
                id="instrumental-toggle"
                checked={isInstrumental}
                onCheckedChange={setIsInstrumental}
              />
              <Music className={cn(
                "w-4 h-4 transition-colors",
                isInstrumental ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
          </div>
        </div>

        {/* Genre Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            {t('quickCreation.genreLabel')} *
          </Label>
          <ImageCardGrid
            options={styleOptionsWithImages}
            selectedId={style}
            onSelect={setStyle}
            variant="square"
            showOther={false}
          />
        </div>

        {/* Voice Type Selection (only if not instrumental) */}
        {!isInstrumental && (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Label className="text-sm font-medium">
              {t('quickCreation.voiceLabel')} *
            </Label>
            <ImageCardGrid
              options={voiceOptionsWithImages}
              selectedId={voiceType}
              onSelect={setVoiceType}
              variant="circle"
              showOther={false}
            />
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm space-y-3">
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full"
          variant="hero"
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {t('quickCreation.createButton')}
        </Button>
        
        <button
          onClick={onSwitchToDetailed}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          {t('quickCreation.switchToDetailed', 'Prefere criar com mais detalhes?')}
        </button>
      </div>
    </div>
  );
};

export default QuickCreation;
