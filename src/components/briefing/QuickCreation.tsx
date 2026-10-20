import { useState, useMemo, memo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, Music, Plus, LayoutGrid, ChevronRight, Palette, AlertTriangle, HelpCircle, Copy, Check, Mic, MicOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ImageCardGrid } from "./ImageCardGrid";
import { genreImages, voiceImages, typeImages } from "@/assets/briefing";
import { cn } from "@/lib/utils";
import { useBriefingTour } from "@/hooks/useBriefingTour";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { QuickPurpose, Energy } from "@/lib/briefingPurpose";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  energy?: Energy;
  moment?: string;
}

const DRAFT_KEY = 'quick_creation_draft';
type Draft = { purpose: string; prompt: string; isInstrumental: boolean; style: string; additionalGenre: string; voiceType: string; songName: string; energy: Energy | ''; moment: string };
const readDraft = (purpose: string): Partial<Draft> => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return d && d.purpose === purpose ? d : {};
  } catch { return {}; }
};
export const clearQuickDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };

interface QuickCreationProps {
  onSubmit: (data: QuickCreationData) => void;
  onBack: () => void;
  onSwitchToDetailed: (data: QuickCreationData) => void;
  purpose?: QuickPurpose | null;
  styleOptions: { id: string; label: string }[];
  voiceOptions: { id: string; label: string }[];
  credits?: number;
}

const QuickCreationComponent = ({ 
  onSubmit, 
  onBack,
  onSwitchToDetailed,
  styleOptions,
  voiceOptions,
  credits = 0,
  purpose = null,
}: QuickCreationProps) => {
  const { t } = useTranslation('briefing');
  const draftKey = purpose || 'legacy';
  const [draft] = useState(() => readDraft(draftKey));
  const [prompt, setPrompt] = useState(draft.prompt || "");
  const [isInstrumental, setIsInstrumental] = useState(!!draft.isInstrumental);
  const [style, setStyle] = useState(draft.style || "");
  const [additionalGenre, setAdditionalGenre] = useState(draft.additionalGenre || "");
  const [showAdditionalGenre, setShowAdditionalGenre] = useState(!!draft.additionalGenre);
  const [voiceType, setVoiceType] = useState(draft.voiceType || "");
  const [songName, setSongName] = useState(draft.songName || "");
  const [energy, setEnergy] = useState<Energy | ''>(draft.energy || "");
  const [moment, setMoment] = useState(draft.moment || "");
  const [showReview, setShowReview] = useState(false);
  const [showNoTitleConfirm, setShowNoTitleConfirm] = useState(false);
  const isMotivational = purpose === 'company_team' || purpose === 'motivation';

  // Autosave draft so nothing is lost when switching modes, going back or reloading
  useEffect(() => {
    const d: Draft = { purpose: draftKey, prompt, isInstrumental, style, additionalGenre, voiceType, songName, energy, moment };
    if (prompt || style || voiceType || songName || additionalGenre || energy || moment) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ }
    }
  }, [draftKey, prompt, isInstrumental, style, additionalGenre, voiceType, songName, energy, moment]);
  const [copied, setCopied] = useState(false);

  // Speech-to-text for inline voice input
  const { isListening, isSupported: isSpeechSupported, transcript, startListening, stopListening, resetTranscript } = useSpeechToText();

  // Tour for quick creation mode
  const { startTour } = useBriefingTour({ mode: 'quick' });

  // Tour is opt-in only ("Ver ajuda") so it never interrupts first-time visitors

  // Append speech transcript to prompt
  useEffect(() => {
    if (transcript) {
      setPrompt(prev => {
        const separator = prev ? ' ' : '';
        const newText = prev + separator + transcript;
        return newText.slice(0, 500); // Respect char limit
      });
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Map style options with images - include infantil
  const styleOptionsWithImages = useMemo(() => {
    const baseOptions = styleOptions.slice(0, 15).map(opt => ({
      id: opt.id,
      label: opt.label,
      imageSrc: genreImages[opt.id as keyof typeof genreImages] || genreImages.pop || ''
    }));
    if (isMotivational) {
      baseOptions.unshift({ id: 'auto', label: t('purpose.autoStyle', 'Deixe o sistema escolher'), imageSrc: genreImages.pop || '' });
    }
    // Add infantil if not already present
    if (!isMotivational && !baseOptions.some(o => o.id === 'infantil')) {
      baseOptions.push({
        id: 'infantil',
        label: 'Infantil',
        imageSrc: typeImages?.infantil || genreImages['pop'] || ''
      });
    }
    return baseOptions;
  }, [styleOptions, isMotivational, t]);

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

  const collect = (): QuickCreationData => ({
    prompt: prompt.trim(),
    isInstrumental,
    style,
    additionalGenre: additionalGenre.trim() || undefined,
    voiceType: isInstrumental ? undefined : voiceType,
    songName: songName.trim() || undefined,
    energy: isMotivational ? (energy || undefined) : undefined,
    moment: purpose === 'motivation' ? (moment || undefined) : undefined,
  });

  const doSubmit = () => {
    clearQuickDraft();
    onSubmit(collect());
  };

  // First click opens a simple review; confirmation there creates the order
  const handleSubmit = () => {
    if (!isValid) return;
    setShowReview(true);
    window.scrollTo({ top: 0 });
  };

  const handleConfirmNoTitle = () => {
    setShowNoTitleConfirm(false);
    doSubmit();
  };

  const handleReset = () => {
    clearQuickDraft();
    setEnergy("");
    setMoment("");
    setPrompt("");
    setIsInstrumental(false);
    setStyle("");
    setAdditionalGenre("");
    setShowAdditionalGenre(false);
    setVoiceType("");
    setSongName("");
  };

  const isValid = prompt.trim().length > 10 && !!style && (isInstrumental || !!voiceType);
  const isAtCharLimit = prompt.length >= 500;

  // Text is carried over automatically into the detailed mode
  const handleCopyAndSwitch = () => {
    setCopied(true);
    onSwitchToDetailed(collect());
  };
  const handleStartTour = () => {
    startTour();
  };

  const purposeTitle = purpose === 'gift' ? t('purpose.gift', 'Presente ou homenagem')
    : purpose === 'company_team' ? t('purpose.companyTeam', 'Motivar minha equipe / evento interno')
    : purpose === 'motivation' ? t('purpose.motivation', 'Motivação pessoal')
    : t('quickCreation.pageTitle', 'Crie música com IA');
  const promptHint = purpose === 'company_team'
    ? t('purpose.hintTeam', 'Conte sobre a empresa e a equipe. Ex: "Equipe de vendas da Loja Silva, falar das metas do ano, união e garra. Nomes: Ana, Carlos."')
    : purpose === 'motivation'
    ? t('purpose.hintMotivation', 'Para quem é e qual a mensagem? Ex: "Para eu ouvir na academia, sobre não desistir e ficar mais forte a cada dia."')
    : purpose === 'gift'
    ? t('purpose.hintGift', 'Quem vai receber e o que você quer dizer? Ex: "Para minha mãe Ana, 60 anos, carinhosa, adora flores e MPB."')
    : null;
  const energyOptions: { id: Energy; label: string }[] = [
    { id: 'calma', label: t('purpose.energyCalm', 'Calma e inspiradora') },
    { id: 'crescente', label: t('purpose.energyRising', 'Crescente, cheia de energia') },
    { id: 'intensa', label: t('purpose.energyIntense', 'Intensa, para dar gás') },
  ];
  const momentOptions = [
    { id: 'treino', label: t('steps.motivational.moment.treino', 'Treino') },
    { id: 'estudo', label: t('steps.motivational.moment.estudo', 'Estudo') },
    { id: 'superacao', label: t('steps.motivational.moment.superacao', 'Superação') },
    { id: 'recomeco', label: t('steps.motivational.moment.recomeco', 'Recomeço') },
  ];
  const styleLabel = style === 'auto' ? t('purpose.autoStyle', 'Deixe o sistema escolher') : (styleOptionsWithImages.find(o => o.id === style)?.label || style);
  const voiceLabel = voiceOptionsWithImages.find(o => o.id === voiceType)?.label || voiceType;
  const chip = (active: boolean) => cn("px-3 py-2 rounded-full border text-sm min-h-[40px] transition-colors", active ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card/60 text-muted-foreground hover:text-foreground");

  if (showReview) {
    const rows: [string, string][] = [
      [t('purpose.reviewPurpose', 'Finalidade'), purposeTitle],
      [t('purpose.reviewMessage', 'Mensagem / história'), prompt.trim()],
      ...(isMotivational && energy ? [[t('purpose.reviewEnergy', 'Clima'), energyOptions.find(e => e.id === energy)?.label || energy] as [string, string]] : []),
      ...(purpose === 'motivation' && moment ? [[t('purpose.reviewMoment', 'Momento'), momentOptions.find(m => m.id === moment)?.label || moment] as [string, string]] : []),
      [t('purpose.reviewStyle', 'Estilo'), styleLabel + (additionalGenre ? ` + ${additionalGenre}` : '')],
      [t('purpose.reviewFormat', 'Formato'), isInstrumental ? t('quickCreation.instrumental', 'Instrumental') : t('purpose.sung', 'Cantada')],
      ...(!isInstrumental ? [[t('purpose.reviewVoice', 'Voz'), voiceLabel] as [string, string]] : []),
      [t('purpose.reviewTitle', 'Título'), songName.trim() || t('purpose.autoTitle', 'Gerado automaticamente')],
    ];
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-10 p-4 border-b border-border/30 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <button onClick={() => setShowReview(false)} className="p-2 -ml-2 rounded-lg hover:bg-muted/50" aria-label={t('purpose.back', 'Voltar')}>
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-lg font-semibold">{t('purpose.reviewHeading', 'Confira seu pedido')}</h1>
              <p className="text-xs text-muted-foreground">{t('purpose.progress', 'Passo {{n}} de 3', { n: 3 })}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
          <dl className="rounded-xl border border-border bg-card divide-y divide-border" data-testid="quick-review">
            {rows.map(([k, v]) => (
              <div key={k} className="p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-sm font-medium whitespace-pre-wrap break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            {credits > 0
              ? t('purpose.costCredit', 'Será usado 1 crédito do seu saldo ({{count}} disponíveis).', { count: credits })
              : t('purpose.costCheckout', 'Na próxima etapa você escolhe o pacote e vê o preço antes de pagar. Nada é cobrado agora.')}
          </p>
        </div>
        <div className="sticky bottom-0 p-4 border-t border-border/30 bg-background/95 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" onClick={() => setShowReview(false)}>{t('purpose.edit', 'Editar')}</Button>
            <Button variant="hero" size="lg" onClick={doSubmit}>{t('purpose.confirm', 'Confirmar e continuar')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 p-4 border-b border-border/30 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={showReview ? () => setShowReview(false) : onBack} className="p-2 -ml-2 rounded-lg hover:bg-muted/50" aria-label={t('purpose.back', 'Voltar')}>
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {purposeTitle}
              </h1>
              <p className="text-xs text-muted-foreground">{t('purpose.progress', 'Passo {{n}} de 3', { n: showReview ? 3 : 2 })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartTour}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              title={t('quickCreation.helpTour', 'Ver tutorial')}
              aria-label={t('purpose.help', 'Ver ajuda')}
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span className="sr-only sm:not-sr-only sm:ml-1 text-xs text-muted-foreground">{t('purpose.help', 'Ver ajuda')}</span>
            </button>
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
          {/* Prompt Input - Dark Card Style */}
          {promptHint && <p className="text-sm text-muted-foreground">{promptHint}</p>}
          <div className="bg-card/80 rounded-xl p-4 border border-border/30">
            <Textarea
              aria-label={t('purpose.reviewMessage', 'Mensagem / história')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('quickCreation.promptPlaceholderDetailed', 'Ex: Uma música de parabéns para minha mãe Ana, que adora MPB e está fazendo 60 anos. Ela é carinhosa e gosta de flores.\n\nDica: Quanto mais detalhes (nomes, idade, gostos, momentos especiais), melhor será sua música!')}
              className="min-h-[120px] resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-foreground placeholder:text-muted-foreground/70 placeholder:text-sm"
              maxLength={500}
            />
            
            {/* Controls row */}
            <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('purpose.restart', 'Recomeçar')}
              </button>
              
              <span className="text-xs text-muted-foreground tabular-nums">
                {prompt.length}/500
              </span>
              
              <div className="flex items-center gap-3">
                {isSpeechSupported && (
                  <button
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-md",
                      isListening 
                        ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    title={isListening ? t('quickCreation.stopRecording', 'Parar gravação') : t('quickCreation.recordAudio', 'Ditar texto')}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isListening ? t('quickCreation.stopRecord', 'Parar') : t('quickCreation.record', 'Ditar')}
                  </button>
                )}
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

            {/* Character limit warning */}
            <AnimatePresence>
              {isAtCharLimit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-foreground">
                        {t('quickCreation.charLimitReached', 'Você atingiu o limite de 500 caracteres. Para textos maiores, use o modo completo!')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAndSwitch}
                        className="gap-1.5 border-amber-500/40 hover:bg-amber-500/10"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            {t('quickCreation.copied', 'Copiado!')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {t('quickCreation.copyAndSwitch', 'Copiar texto e ir para modo completo')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isMotivational && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">{t('purpose.energyTitle', 'Qual a energia da música?')}</h3>
              <div className="flex flex-wrap gap-2">
                {energyOptions.map(o => (
                  <button key={o.id} type="button" aria-pressed={energy === o.id} className={chip(energy === o.id)} onClick={() => setEnergy(o.id)}>{o.label}</button>
                ))}
              </div>
            </section>
          )}
          {purpose === 'motivation' && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">{t('purpose.momentTitle', 'Para qual momento?')} <span className="text-muted-foreground font-normal">{t('quickCreation.optional', '(opcional)')}</span></h3>
              <div className="flex flex-wrap gap-2">
                {momentOptions.map(o => (
                  <button key={o.id} type="button" aria-pressed={moment === o.id} className={chip(moment === o.id)} onClick={() => setMoment(moment === o.id ? '' : o.id)}>{o.label}</button>
                ))}
              </div>
            </section>
          )}

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
            {t('purpose.reviewButton', 'Revisar pedido')}
          </Button>
          
          <button
            onClick={() => onSwitchToDetailed(collect())}
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
              {isMotivational ? t('purpose.customizeMore', 'Personalizar mais (opcional)') : t('quickCreation.switchToDetailed', 'Crie sua música com mais detalhes')}
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

      {/* No Title Confirmation Dialog */}
      <AlertDialog open={showNoTitleConfirm} onOpenChange={setShowNoTitleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('quickCreation.noTitleConfirm.title', 'Criar música sem título?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('quickCreation.noTitleConfirm.description', 'Você não definiu um nome para sua música. Deseja que a IA gere um título automaticamente?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('quickCreation.noTitleConfirm.cancel', 'Voltar e adicionar título')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNoTitle}>
              {t('quickCreation.noTitleConfirm.confirm', 'Sim, gerar automaticamente')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export const QuickCreation = memo(QuickCreationComponent);
QuickCreation.displayName = 'QuickCreation';

export default QuickCreation;