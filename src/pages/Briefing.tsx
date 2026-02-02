import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Music, Send, Bot, User, ArrowRight, Loader2, ArrowLeft, Mic, MicOff, Check, Edit, Sparkles, CreditCard, Zap, Piano, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppModal from "@/components/WhatsAppModal";
import CreditsBanner from "@/components/CreditsBanner";
import { useCredits, getPlanLabel } from "@/hooks/useCredits";
import { usePreviewCredit } from "@/hooks/usePreviewCredit";
import { useBriefingTranslations, INSTRUMENT_OPTIONS } from "@/hooks/useBriefingTranslations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpcomingCelebrations } from "@/hooks/useUpcomingCelebrations";
import CelebrationSuggestion from "@/components/CelebrationSuggestion";
import { ImageCardGrid } from "@/components/briefing/ImageCardGrid";
import { QuickCreation, QuickCreationData } from "@/components/briefing/QuickCreation";
import { 
  genreImages, typeImages, emotionImages, voiceImages, corporateImages, gospelContextImages,
  childAgeImages, childObjectiveImages, childThemeImages, childMoodImages, childStyleImages,
  soundtrackUsageImages, soundtrackEmotionImages, creationModeImages
} from "@/assets/briefing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  options?: { id: string; label: string; description?: string }[];
  field?: keyof BriefingFormData;
  inputType?: 'text' | 'textarea' | 'options' | 'intensity' | 'yesno' | 'options-with-other' | 'word-suggestions' | 'multi-select';
}

interface BriefingFormData {
  isInstrumental: boolean;
  hasCustomLyric: boolean;
  customLyricText: string;
  hasCustomStylePrompt: boolean;
  customStylePrompt: string;
  isConfidential: boolean;
  musicType: string;
  emotion: string;
  emotionIntensity: number;
  story: string;
  hasMonologue: boolean;
  monologuePosition: string;
  mandatoryWords: string;
  restrictedWords: string;
  style: string;
  customStyle: string;
  rhythm: string;
  atmosphere: string;
  songName: string;
  autoGenerateName: boolean;
  voiceType: string;
  // Campos instrumentais
  instruments: string[];
  soloInstrument: string;
  soloMoment: string;
  instrumentationNotes: string;
  // Campos para jingle/propaganda corporativa
  corporateFormat: 'institucional' | 'jingle' | '';
  contactInfo: string;
  callToAction: string;
  // Campos para data comemorativa
  celebrationType?: string;
  celebrationName?: string;
  celebrationEmoji?: string;
  // Campos para música motivacional
  motivationalMoment?: string;
  motivationalIntensity?: string;
  motivationalNarrative?: string;
  motivationalPerspective?: string;
  // Campos para música religiosa/gospel
  gospelContext?: string;
  gospelIntensity?: string;
  gospelStyle?: string;
  gospelNarrative?: string;
  gospelPerspective?: string;
  biblicalReference?: string;
  // Campos para música infantil
  childAgeGroup?: string;
  childObjective?: string;
  childTheme?: string;
  childMood?: string;
  childStyle?: string;
  childInteraction?: string;
  childNarrative?: string;
  // Campos para trilha sonora
  soundtrackUsage?: string;
  soundtrackEmotion?: string;
  soundtrackDynamics?: string;
  soundtrackStyle?: string;
  soundtrackRhythm?: string;
  soundtrackVoice?: string;
  soundtrackScene?: string;
  soundtrackLanguage?: string;
}

const BRIEFING_STORAGE_KEY = 'briefing_autosave';

// Detectar termos técnicos que precisam de pronúncia
const detectCriticalTerms = (text: string): string[] => {
  const patterns = [
    /\b[A-Z]{2,}[0-9]*\b/g,                    // Siglas: NYV8, WEB3, ABC
    /\b[A-Z]+[0-9]+[A-Z0-9]*\b/g,              // Letras+números: NYV8, W3C
    /\b[A-Z][a-z]*[A-Z][a-zA-Z]*\b/g,          // CamelCase: iPhone, PowerBI
    /\b[A-Z]{2,}[a-z]+\b/g,                    // Siglas com sufixo: POKERfi
  ];
  
  const terms = new Set<string>();
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        // Filtrar termos comuns que não precisam de pronúncia
        if (!['EU', 'EUA', 'OK', 'TV'].includes(m)) {
          terms.add(m);
        }
      });
    }
  });
  
  return Array.from(terms);
};

// Currency Warning Component
const CurrencyWarning = ({ language }: { language: string }) => {
  if (language === 'pt-BR') return null;
  
  const messages: Record<string, string> = {
    'en': '💱 Prices displayed in local currency. Payment processed in BRL (Brazilian Real).',
    'es': '💱 Precios mostrados en moneda local. Pago procesado en BRL (Real Brasileño).',
    'it': '💱 Prezzi visualizzati in valuta locale. Pagamento elaborato in BRL (Real Brasiliano).',
  };
  
  return (
    <Alert className="bg-amber-500/10 border-amber-500/30">
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
        {messages[language] || messages['en']}
      </AlertDescription>
    </Alert>
  );
};

const Briefing = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } = useSpeechToText();
  
  // i18n translations
  const {
    t,
    i18n,
    getInstrumentOptions,
    getEmotionOptions: getTranslatedEmotionOptions,
    voiceTypeOptions,
    voiceTypeOptionsSimple,
    musicTypeOptions,
    musicTypeOptionsCustomLyric,
    styleOptions,
    styleOptionsCustomLyric,
    instrumentalStyleOptions,
    rhythmOptions,
    atmosphereOptions,
    atmosphereOptionsSimple,
    soloOptions,
    nameOptions,
    customStylePromptOptions,
    isInstrumentalOptions,
    corporateFormatOptions,
    // Motivational options
    motivationalMomentOptions,
    motivationalIntensityOptions,
    motivationalNarrativeOptions,
    motivationalPerspectiveOptions,
    motivationalStyleOptions,
    getMotivationalChatMessages,
    // Gospel options
    gospelContextOptions,
    gospelEmotionOptions,
    gospelIntensityOptions,
    gospelStyleOptions,
    gospelNarrativeOptions,
    gospelPerspectiveOptions,
    getGospelChatMessages,
    // Children options
    childAgeGroupOptions,
    childObjectiveOptions,
    childThemeOptions,
    childMoodOptions,
    childStyleOptions,
    childInteractionOptions,
    childNarrativeOptions,
    childVoiceOptions,
    getChildrenChatMessages,
    // Soundtrack options
    soundtrackUsageOptions,
    soundtrackEmotionOptions,
    soundtrackDynamicsOptions,
    soundtrackStyleOptions,
    soundtrackRhythmOptions,
    soundtrackVoiceOptions,
    soundtrackLanguageOptions,
    getSoundtrackChatMessages,
    getPlanLabels,
    getIntensityLabels,
    getChatMessages,
    getChatButtons,
    getRestoreSessionMessages,
    getConfirmationLabels,
    getCreditModalLabels,
    getToastMessages,
  } = useBriefingTranslations();
  
  // Get translated labels
  const PLAN_LABELS = getPlanLabels();
  const chatMessages = getChatMessages();
  const chatButtons = getChatButtons();
  const restoreMessages = getRestoreSessionMessages();
  const confirmationLabels = getConfirmationLabels();
  const creditModalLabels = getCreditModalLabels();
  const toastMessages = getToastMessages();
  const intensityLabels = getIntensityLabels();
  const instrumentOptions = getInstrumentOptions();
  const motivationalMessages = getMotivationalChatMessages();
  const gospelMessages = getGospelChatMessages();
  const childrenMessages = getChildrenChatMessages();
  const soundtrackMessages = getSoundtrackChatMessages();
  
  // Plan selection state
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Creation mode state (quick vs detailed)
  const [creationMode, setCreationMode] = useState<'quick' | 'detailed' | null>(null);
  
  // Celebration banner state - check localStorage for dismissed state
  const CELEBRATION_DISMISS_KEY = 'celebration_dismissed_date';
  const { closestDate, isLoading: isCelebrationLoading } = useUpcomingCelebrations(30);
  const [celebrationDismissed, setCelebrationDismissed] = useState(() => {
    // Check if celebration was dismissed today in localStorage
    const dismissedData = localStorage.getItem(CELEBRATION_DISMISS_KEY);
    if (dismissedData) {
      try {
        const { date } = JSON.parse(dismissedData);
        const today = new Date().toDateString();
        return date === today;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [showCelebrationTypeModal, setShowCelebrationTypeModal] = useState(false);
  const [selectedCelebration, setSelectedCelebration] = useState<typeof closestDate>(null);
  
  // Handle celebration dismiss with localStorage
  const handleCelebrationDismiss = () => {
    if (closestDate) {
      localStorage.setItem(CELEBRATION_DISMISS_KEY, JSON.stringify({
        date: new Date().toDateString(),
        celebrationId: closestDate.id,
      }));
    }
    setCelebrationDismissed(true);
  };
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [showCustomStyleInput, setShowCustomStyleInput] = useState(false);
  const [showCustomInstrumentInput, setShowCustomInstrumentInput] = useState(false);
  const [customInstrumentValue, setCustomInstrumentValue] = useState("");
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isEditingSingleField, setIsEditingSingleField] = useState(false);
  const [editingFieldStep, setEditingFieldStep] = useState<number | null>(null);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [showNoCreditModal, setShowNoCreditModal] = useState(false);
  const [quickModeFormData, setQuickModeFormData] = useState<BriefingFormData | null>(null);
  
  const initialFormData: BriefingFormData = {
    isInstrumental: false,
    hasCustomLyric: false,
    customLyricText: "",
    hasCustomStylePrompt: false,
    customStylePrompt: "",
    isConfidential: false,
    musicType: "",
    emotion: "",
    emotionIntensity: 3,
    story: "",
    hasMonologue: false,
    monologuePosition: "",
    mandatoryWords: "",
    restrictedWords: "",
    style: "",
    customStyle: "",
    rhythm: "",
    atmosphere: "",
    songName: "",
    autoGenerateName: true,
    voiceType: "",
    // Campos instrumentais
    instruments: [],
    soloInstrument: "",
    soloMoment: "",
    instrumentationNotes: "",
    // Campos para jingle/propaganda corporativa
    corporateFormat: '',
    contactInfo: '',
    callToAction: ''
  };

  const [formData, setFormData] = useState<BriefingFormData>(() => {
    // Restaurar do localStorage se existir
    const saved = localStorage.getItem(BRIEFING_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...initialFormData, ...parsed };
      } catch {
        return initialFormData;
      }
    }
    return initialFormData;
  });
  
  const [hasSavedData, setHasSavedData] = useState(() => {
    return !!localStorage.getItem(BRIEFING_STORAGE_KEY);
  });

  // Auto-save a cada mudança no formData
  useEffect(() => {
    const hasAnyData = Object.values(formData).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'string') return v.length > 0;
      if (typeof v === 'boolean') return v;
      return v !== 3;
    });
    if (hasAnyData) {
      localStorage.setItem(BRIEFING_STORAGE_KEY, JSON.stringify(formData));
      setHasSavedData(true);
    }
  }, [formData]);

  const clearSavedBriefing = () => {
    localStorage.removeItem(BRIEFING_STORAGE_KEY);
    setHasSavedData(false);
  };

  const userPlan = profile?.plan || "free";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showConfirmation]);

  // Atualizar input com transcrição de voz
  useEffect(() => {
    if (transcript) {
      setInputValue(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Iniciar chat (verificar planId ou type, ou mostrar seleção de pacote)
  useEffect(() => {
    const timer = setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const planIdFromUrl = urlParams.get('planId');
      const typeFromUrl = urlParams.get('type'); // vocal, instrumental, custom_lyric
      const startAsInstrumental = urlParams.get('instrumental') === 'true';
      
      // Se tem type na URL, pular seleção de plano e ir direto
      if (typeFromUrl) {
        setShowPlanSelection(false);
        
        if (typeFromUrl === 'instrumental') {
          setFormData(prev => ({ 
            ...prev, 
            isInstrumental: true, 
            hasCustomLyric: false,
            // Limpar campos de celebração de sessões anteriores
            celebrationType: undefined,
            celebrationName: undefined,
            celebrationEmoji: undefined,
          }));
          setSelectedPlanId('single_instrumental');
          setCurrentStep(1);
          addBotMessage(chatFlow[1]); // musicType
        } else if (typeFromUrl === 'custom_lyric') {
          setFormData(prev => ({ 
            ...prev, 
            isInstrumental: false, 
            hasCustomLyric: true,
            // Limpar campos de celebração de sessões anteriores
            celebrationType: undefined,
            celebrationName: undefined,
            celebrationEmoji: undefined,
          }));
          setSelectedPlanId('single_custom_lyric');
          setCurrentStep(22);
          addBotMessage(chatFlow[22]); // customLyricText
        } else {
          // vocal - ir direto para criação rápida
          setFormData(prev => ({ 
            ...prev, 
            isInstrumental: false, 
            hasCustomLyric: false,
            // Limpar campos de celebração de sessões anteriores
            celebrationType: undefined,
            celebrationName: undefined,
            celebrationEmoji: undefined,
          }));
          setSelectedPlanId('single');
          setCreationMode('quick'); // Ativar modo rápido ao invés do chat
        }
        return;
      }
      
      // NOVO: Verificar se tem celebração na URL
      const celebrationFromUrl = urlParams.get('celebration');
      const celebrationNameFromUrl = urlParams.get('celebrationName');
      const celebrationEmojiFromUrl = urlParams.get('celebrationEmoji');
      
      if (celebrationFromUrl) {
        // Criar objeto de celebração a partir dos params da URL
        const urlCelebration = {
          id: celebrationFromUrl,
          localizedName: celebrationNameFromUrl || 'Celebração',
          emoji: decodeURIComponent(celebrationEmojiFromUrl || '🎉'),
          // Campos com defaults seguros para compatibilidade
          name: celebrationNameFromUrl || 'Celebração',
          name_en: null,
          name_es: null,
          name_it: null,
          month: new Date().getMonth() + 1,
          day: new Date().getDate(),
          calculation_rule: null,
          suggested_music_type: null,
          suggested_atmosphere: null,
          suggested_emotion: null,
          description: null,
          description_en: null,
          description_es: null,
          description_it: null,
          is_active: true,
          sort_order: 0,
          calculatedDate: new Date(),
          daysUntil: 0,
          localizedDescription: '',
        };
        
        setSelectedCelebration(urlCelebration as typeof closestDate);
        setShowCelebrationTypeModal(true);
        setShowPlanSelection(false);
        return;
      }
      
      // Se não tem planId na URL, mostrar seleção de pacote primeiro
      if (!planIdFromUrl) {
        setShowPlanSelection(true);
        return;
      }
      
      // Definir o plano selecionado
      setSelectedPlanId(planIdFromUrl);
      
      if (startAsInstrumental) {
        // Entrar direto no fluxo instrumental, pulando a primeira pergunta
        setFormData(prev => ({ ...prev, isInstrumental: true }));
        setCurrentStep(1); // Vai direto para musicType
        addBotMessage(chatFlow[1]);
        return;
      }
      
      if (hasSavedData && formData.musicType) {
        // Tem dados salvos, mostrar opção de continuar
        setMessages([{
          id: 'msg-restore',
          type: 'bot',
          content: `${restoreMessages.welcome}\n\n${restoreMessages.description}`,
          inputType: 'options',
          options: [
            { id: 'continue', label: restoreMessages.continueLabel, description: restoreMessages.continueDesc },
            { id: 'restart', label: restoreMessages.restartLabel, description: restoreMessages.restartDesc }
          ]
        }]);
      } else {
        addBotMessage(chatFlow[0]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Encontrar o step onde o usuário parou
  const getSavedStep = (data: BriefingFormData): number => {
    // Fluxo "Já tenho a letra" (índices 22-29)
    if (data.hasCustomLyric) {
      if (!data.customLyricText) return 22;
      // Índice 23: pergunta se tem style pronto
      if (data.hasCustomStylePrompt === undefined) return 23;
      // Se tem style pronto mas não digitou, vai para 24
      if (data.hasCustomStylePrompt && !data.customStylePrompt) return 24;
      // Se não tem style pronto, segue fluxo normal
      if (!data.hasCustomStylePrompt) {
        if (!data.musicType) return 25;
        if (!data.voiceType) return 26;
        if (!data.style) return 27;
        if (!data.rhythm) return 28;
        if (!data.atmosphere) return 29;
        if (!data.songName) return 30;
      } else {
        // Tem style pronto, pula direto para nome
        if (!data.songName) return 30;
      }
      return 100;
    }
    
    if (!data.musicType) return 1; // Primeiro após isInstrumental
    if (data.isInstrumental) {
      // Fluxo instrumental - solos são APENAS para instrumental
      if (!data.style) return 2;
      if (data.instruments.length === 0) return 3;
      // Solo steps (4-6) APENAS para instrumental
      if (!data.soloInstrument && data.soloInstrument !== 'none') return 4;
      if (data.soloInstrument === 'want_solo' && !data.soloMoment) return 6;
      if (!data.rhythm) return 7;
      if (!data.atmosphere) return 8;
      if (!data.story) return 9;
      return 100; // Vai para confirmação
    } else {
      // Fluxo cantada - NUNCA passa por steps de solo (4-6)
      if (!data.emotion) return 10;
      if (!data.story) return 12;
      if (!data.voiceType) return 14;
      if (!data.style) return 15;
      if (!data.rhythm) return 16;
      if (!data.atmosphere) return 17;
      return 100;
    }
  };

  // FLUXO DO CHAT - Índices:
  // 0: isInstrumental
  // 1: musicType
  // INSTRUMENTAL (2-9):
  // 2: style, 3: instruments, 4: wantSolo, 5: soloInstrument, 6: soloMoment, 7: rhythm, 8: atmosphere, 9: story
  // CANTADA (10-19):
  // 10: emotion, 11: emotionIntensity, 12: story, 13: mandatoryWords, 14: voiceType, 15: style, 16: rhythm, 17: atmosphere, 18: autoGenerateName, 19: songName
  // INSTRUMENTAL NAME (20-21):
  // 20: autoGenerateName (instrumental), 21: songName (instrumental)
  // JÁ TENHO A LETRA (22-30):
  // 22: customLyricText, 23: hasCustomStylePrompt, 24: customStylePrompt, 25: musicType, 26: voiceType, 27: style, 28: rhythm, 29: atmosphere, 30: songName
  // 2: style, 3: instruments, 4: wantSolo, 5: soloMoment, 6: rhythm, 7: atmosphere, 8: story, 9: instrumentationNotes
  // CANTADA (10-19):
  // 10: emotion, 11: emotionIntensity, 12: story, 13: mandatoryWords, 14: voiceType, 15: style, 16: rhythm, 17: atmosphere, 18: autoGenerateName, 19: songName
  // INSTRUMENTAL NAME (20-21):
  // 20: autoGenerateName (instrumental), 21: songName (instrumental)
  // JÁ TENHO A LETRA (22-27):
  // 22: customLyricText, 23: musicType, 24: voiceType, 25: style, 26: rhythm, 27: atmosphere

  const chatFlow: Omit<ChatMessage, 'id'>[] = [
    // Step 0: Escolha cantada ou instrumental
    {
      type: 'bot',
      content: chatMessages.isInstrumental,
      inputType: 'options',
      field: 'isInstrumental',
      options: isInstrumentalOptions
    },
    // Step 1: Tipo de música
    {
      type: 'bot',
      content: chatMessages.musicType,
      inputType: 'options',
      field: 'musicType',
      options: musicTypeOptions
    },
    // FLUXO INSTRUMENTAL (Steps 2-9)
    // Step 2: Estilo (instrumental)
    {
      type: 'bot',
      content: chatMessages.style,
      inputType: 'options-with-other',
      field: 'style',
      options: instrumentalStyleOptions
    },
    // Step 3: Instrumentos (multi-select)
    {
      type: 'bot',
      content: chatMessages.instruments,
      inputType: 'multi-select',
      field: 'instruments',
      options: instrumentOptions
    },
    // Step 4: Quer solo?
    {
      type: 'bot',
      content: chatMessages.wantSolo,
      inputType: 'options',
      field: 'soloInstrument',
      options: soloOptions.wantSolo
    },
    // Step 5: Qual instrumento terá o solo (dinâmico)
    {
      type: 'bot',
      content: chatMessages.whichInstrument,
      inputType: 'options',
      field: 'soloInstrument',
      options: [] // Preenchido dinamicamente
    },
    // Step 6: Momento do solo
    {
      type: 'bot',
      content: chatMessages.soloMoment,
      inputType: 'options',
      field: 'soloMoment',
      options: soloOptions.moment
    },
    // Step 7: Ritmo (instrumental)
    {
      type: 'bot',
      content: chatMessages.rhythm,
      inputType: 'options',
      field: 'rhythm',
      options: rhythmOptions
    },
    // Step 8: Atmosfera (instrumental)
    {
      type: 'bot',
      content: chatMessages.atmosphere,
      inputType: 'options',
      field: 'atmosphere',
      options: atmosphereOptions
    },
    // Step 9: História/Contexto (instrumental)
    {
      type: 'bot',
      content: chatMessages.storyInstrumental,
      inputType: 'textarea',
      field: 'story'
    },
    // FLUXO CANTADA (Steps 10-19)
    // Step 10: Emoção (índice 10)
    {
      type: 'bot',
      content: chatMessages.emotion,
      inputType: 'options',
      field: 'emotion',
      options: [] // Preenchido dinamicamente com getTranslatedEmotionOptions
    },
    // Step 11: Intensidade (índice 11)
    {
      type: 'bot',
      content: chatMessages.emotionIntensity,
      inputType: 'intensity',
      field: 'emotionIntensity'
    },
    // Step 12: História (índice 12)
    {
      type: 'bot',
      content: chatMessages.storyVocal,
      inputType: 'textarea',
      field: 'story'
    },
    // Step 13: Palavras obrigatórias (índice 13)
    {
      type: 'bot',
      content: chatMessages.mandatoryWords,
      inputType: 'word-suggestions',
      field: 'mandatoryWords'
    },
    // Step 14: Tipo de voz (índice 14)
    {
      type: 'bot',
      content: chatMessages.voiceType,
      inputType: 'options',
      field: 'voiceType',
      options: voiceTypeOptions
    },
    // Step 15: Estilo (cantada) (índice 15)
    {
      type: 'bot',
      content: chatMessages.style,
      inputType: 'options-with-other',
      field: 'style',
      options: styleOptions
    },
    // Step 16: Ritmo (cantada) (índice 16)
    {
      type: 'bot',
      content: chatMessages.rhythm,
      inputType: 'options',
      field: 'rhythm',
      options: rhythmOptions
    },
    // Step 17: Atmosfera (cantada) (índice 17)
    {
      type: 'bot',
      content: chatMessages.atmosphere,
      inputType: 'options',
      field: 'atmosphere',
      options: atmosphereOptions
    },
    // Step 18: Nome automático? (cantada) (índice 18)
    {
      type: 'bot',
      content: chatMessages.songNameAuto,
      inputType: 'options',
      field: 'autoGenerateName',
      options: nameOptions
    },
    // Step 19: Nome da música (cantada) (índice 19)
    {
      type: 'bot',
      content: chatMessages.songNameInput,
      inputType: 'text',
      field: 'songName'
    },
    // FLUXO INSTRUMENTAL - NOME (Steps 20-21)
    // Step 20: Nome automático? (Instrumental) (índice 20)
    {
      type: 'bot',
      content: chatMessages.songNameAutoInstrumental,
      inputType: 'options',
      field: 'autoGenerateName',
      options: nameOptions
    },
    // Step 21: Nome da música (Instrumental) (índice 21)
    {
      type: 'bot',
      content: chatMessages.songNameInputInstrumental,
      inputType: 'text',
      field: 'songName'
    },
    // FLUXO "JÁ TENHO A LETRA" (índices 22-30 do array)
    // Índice 22: Cole sua letra
    {
      type: 'bot',
      content: chatMessages.customLyricPaste,
      inputType: 'textarea',
      field: 'customLyricText'
    },
    // Índice 23: Tem style pronto?
    {
      type: 'bot',
      content: chatMessages.hasStylePrompt,
      inputType: 'options',
      field: 'hasCustomStylePrompt',
      options: customStylePromptOptions
    },
    // Índice 24: Cole o style (se tiver)
    {
      type: 'bot',
      content: chatMessages.pasteStyle,
      inputType: 'textarea',
      field: 'customStylePrompt'
    },
    // Índice 25: Tipo de música (custom lyric)
    {
      type: 'bot',
      content: chatMessages.musicTypeCustomLyric,
      inputType: 'options',
      field: 'musicType',
      options: musicTypeOptionsCustomLyric
    },
    // Índice 26: Tipo de voz (custom lyric)
    {
      type: 'bot',
      content: chatMessages.voiceType,
      inputType: 'options',
      field: 'voiceType',
      options: voiceTypeOptionsSimple
    },
    // Índice 27: Estilo (custom lyric)
    {
      type: 'bot',
      content: chatMessages.styleCustomLyric,
      inputType: 'options-with-other',
      field: 'style',
      options: styleOptionsCustomLyric
    },
    // Índice 28: Ritmo (custom lyric)
    {
      type: 'bot',
      content: chatMessages.rhythmCustomLyric,
      inputType: 'options',
      field: 'rhythm',
      options: rhythmOptions
    },
    // Índice 29: Atmosfera (custom lyric)
    {
      type: 'bot',
      content: chatMessages.atmosphere,
      inputType: 'options',
      field: 'atmosphere',
      options: atmosphereOptionsSimple
    },
    // Índice 30: Nome da música (custom lyric)
    {
      type: 'bot',
      content: chatMessages.songNameCustomLyric,
      inputType: 'text',
      field: 'songName'
    },
    // FLUXO JINGLE/CORPORATIVO (índices 31-33)
    // Índice 31: Formato corporativo
    {
      type: 'bot',
      content: chatMessages.corporateFormat,
      inputType: 'options',
      field: 'corporateFormat',
      options: corporateFormatOptions
    },
    // Índice 32: Informações de contato (para jingle)
    {
      type: 'bot',
      content: chatMessages.contactInfo,
      inputType: 'textarea',
      field: 'contactInfo'
    },
    // Índice 33: Chamada para ação (para jingle)
    {
      type: 'bot',
      content: chatMessages.callToAction,
      inputType: 'text',
      field: 'callToAction'
    },
    // FLUXO MOTIVACIONAL (índices 34-43)
    // 34: moment, 35: emotion, 36: motivationalIntensity, 37: style, 38: narrative, 39: perspective, 40: story, 41: mandatoryWords, 42: voiceType, 43: autoGenerateName
    // Índice 34: Momento de uso
    {
      type: 'bot',
      content: motivationalMessages.moment,
      inputType: 'options',
      field: 'motivationalMoment',
      options: motivationalMomentOptions
    },
    // Índice 35: Emoção motivacional
    {
      type: 'bot',
      content: chatMessages.emotion, // Será substituído dinamicamente
      inputType: 'options',
      field: 'emotion',
      options: [] // Preenchido dinamicamente
    },
    // Índice 36: Intensidade motivacional
    {
      type: 'bot',
      content: motivationalMessages.intensity,
      inputType: 'options',
      field: 'motivationalIntensity',
      options: motivationalIntensityOptions
    },
    // Índice 37: Estilo motivacional
    {
      type: 'bot',
      content: motivationalMessages.style,
      inputType: 'options',
      field: 'style',
      options: motivationalStyleOptions
    },
    // Índice 38: Narrativa (cantada, com monólogo, etc)
    {
      type: 'bot',
      content: motivationalMessages.narrative,
      inputType: 'options',
      field: 'motivationalNarrative',
      options: motivationalNarrativeOptions
    },
    // Índice 39: Perspectiva (eu, você, universal)
    {
      type: 'bot',
      content: motivationalMessages.perspective,
      inputType: 'options',
      field: 'motivationalPerspective',
      options: motivationalPerspectiveOptions
    },
    // Índice 40: História/contexto motivacional
    {
      type: 'bot',
      content: motivationalMessages.story,
      inputType: 'textarea',
      field: 'story'
    },
    // Índice 41: Palavras-chave (optional)
    {
      type: 'bot',
      content: chatMessages.mandatoryWords,
      inputType: 'word-suggestions',
      field: 'mandatoryWords'
    },
    // Índice 42: Tipo de voz
    {
      type: 'bot',
      content: chatMessages.voiceType,
      inputType: 'options',
      field: 'voiceType',
      options: voiceTypeOptions
    },
    // Índice 43: Nome automático? (motivacional)
    {
      type: 'bot',
      content: chatMessages.songNameAuto,
      inputType: 'options',
      field: 'autoGenerateName',
      options: nameOptions
    },
    // FLUXO GOSPEL/RELIGIOSO (índices 44-53)
    // 44: gospelContext, 45: emotion, 46: gospelIntensity, 47: gospelStyle, 48: gospelNarrative, 49: gospelPerspective, 50: biblicalReference, 51: story, 52: voiceType, 53: autoGenerateName
    // Índice 44: Contexto espiritual
    {
      type: 'bot',
      content: gospelMessages.context,
      inputType: 'options',
      field: 'gospelContext',
      options: gospelContextOptions
    },
    // Índice 45: Emoção espiritual
    {
      type: 'bot',
      content: gospelMessages.emotion,
      inputType: 'options',
      field: 'emotion',
      options: gospelEmotionOptions
    },
    // Índice 46: Intensidade do canto
    {
      type: 'bot',
      content: gospelMessages.intensity,
      inputType: 'options',
      field: 'gospelIntensity',
      options: gospelIntensityOptions
    },
    // Índice 47: Estilo gospel
    {
      type: 'bot',
      content: gospelMessages.style,
      inputType: 'options',
      field: 'style',
      options: gospelStyleOptions
    },
    // Índice 48: Narrativa (cantada, com leituras, etc)
    {
      type: 'bot',
      content: gospelMessages.narrative,
      inputType: 'options',
      field: 'gospelNarrative',
      options: gospelNarrativeOptions
    },
    // Índice 49: Perspectiva (eu, nós, profética)
    {
      type: 'bot',
      content: gospelMessages.perspective,
      inputType: 'options',
      field: 'gospelPerspective',
      options: gospelPerspectiveOptions
    },
    // Índice 50: Referência bíblica (opcional)
    {
      type: 'bot',
      content: gospelMessages.biblicalReference,
      inputType: 'textarea',
      field: 'biblicalReference'
    },
    // Índice 51: História/contexto
    {
      type: 'bot',
      content: gospelMessages.story,
      inputType: 'textarea',
      field: 'story'
    },
    // Índice 52: Tipo de voz
    {
      type: 'bot',
      content: chatMessages.voiceType,
      inputType: 'options',
      field: 'voiceType',
      options: voiceTypeOptions
    },
    // Índice 53: Nome automático? (gospel)
    {
      type: 'bot',
      content: chatMessages.songNameAuto,
      inputType: 'options',
      field: 'autoGenerateName',
      options: nameOptions
    },
    // PLACEHOLDERS para índices 54-59 (reservados para expansões)
    { type: 'bot', content: '', inputType: 'text', field: 'story' } as ChatMessage, // 54
    { type: 'bot', content: '', inputType: 'text', field: 'story' } as ChatMessage, // 55
    { type: 'bot', content: '', inputType: 'text', field: 'story' } as ChatMessage, // 56
    { type: 'bot', content: '', inputType: 'text', field: 'story' } as ChatMessage, // 57
    { type: 'bot', content: '', inputType: 'text', field: 'story' } as ChatMessage, // 58
    { type: 'bot', content: '', inputType: 'text', field: 'story' } as ChatMessage, // 59
    // FLUXO INFANTIL (índices 60-69)
    // Índice 60: Faixa etária
    {
      type: 'bot',
      content: childrenMessages.ageGroup,
      inputType: 'options',
      field: 'childAgeGroup',
      options: childAgeGroupOptions
    },
    // Índice 61: Objetivo da música
    {
      type: 'bot',
      content: childrenMessages.objective,
      inputType: 'options',
      field: 'childObjective',
      options: childObjectiveOptions
    },
    // Índice 62: Tema central
    {
      type: 'bot',
      content: childrenMessages.theme,
      inputType: 'options',
      field: 'childTheme',
      options: childThemeOptions
    },
    // Índice 63: Tom emocional / Clima
    {
      type: 'bot',
      content: childrenMessages.mood,
      inputType: 'options',
      field: 'childMood',
      options: childMoodOptions
    },
    // Índice 64: Estilo musical infantil
    {
      type: 'bot',
      content: childrenMessages.style,
      inputType: 'options',
      field: 'childStyle',
      options: childStyleOptions
    },
    // Índice 65: Interação (palmas, repetir, etc)
    {
      type: 'bot',
      content: childrenMessages.interaction,
      inputType: 'options',
      field: 'childInteraction',
      options: childInteractionOptions
    },
    // Índice 66: Narrativa (cantada, com falas, etc)
    {
      type: 'bot',
      content: childrenMessages.narrative,
      inputType: 'options',
      field: 'childNarrative',
      options: childNarrativeOptions
    },
    // Índice 67: História/contexto infantil
    {
      type: 'bot',
      content: childrenMessages.story,
      inputType: 'textarea',
      field: 'story'
    },
    // Índice 68: Tipo de voz infantil
    {
      type: 'bot',
      content: chatMessages.voiceType,
      inputType: 'options',
      field: 'voiceType',
      options: childVoiceOptions
    },
    // Índice 69: Nome automático? (infantil)
    {
      type: 'bot',
      content: chatMessages.songNameAuto,
      inputType: 'options',
      field: 'autoGenerateName',
      options: nameOptions
    },
    // FLUXO TRILHA SONORA (índices 70-78)
    // Índice 70: Uso da trilha
    {
      type: 'bot',
      content: soundtrackMessages.usage,
      inputType: 'options',
      field: 'soundtrackUsage',
      options: soundtrackUsageOptions
    },
    // Índice 71: Emoção da trilha
    {
      type: 'bot',
      content: soundtrackMessages.emotion,
      inputType: 'options',
      field: 'soundtrackEmotion',
      options: soundtrackEmotionOptions
    },
    // Índice 72: Dinâmica/evolução
    {
      type: 'bot',
      content: soundtrackMessages.dynamics,
      inputType: 'options',
      field: 'soundtrackDynamics',
      options: soundtrackDynamicsOptions
    },
    // Índice 73: Estilo da trilha
    {
      type: 'bot',
      content: soundtrackMessages.style,
      inputType: 'options',
      field: 'soundtrackStyle',
      options: soundtrackStyleOptions
    },
    // Índice 74: Ritmo da trilha
    {
      type: 'bot',
      content: soundtrackMessages.rhythm,
      inputType: 'options',
      field: 'soundtrackRhythm',
      options: soundtrackRhythmOptions
    },
    // Índice 75: Presença de voz
    {
      type: 'bot',
      content: soundtrackMessages.voice,
      inputType: 'options',
      field: 'soundtrackVoice',
      options: soundtrackVoiceOptions
    },
    // Índice 76: Descrição da cena (opcional)
    {
      type: 'bot',
      content: soundtrackMessages.scene,
      inputType: 'textarea',
      field: 'soundtrackScene'
    },
    // Índice 77: Idioma (para voz/monólogo)
    {
      type: 'bot',
      content: soundtrackMessages.language,
      inputType: 'options',
      field: 'soundtrackLanguage',
      options: soundtrackLanguageOptions
    },
    // Índice 78: Nome automático? (trilha sonora)
    {
      type: 'bot',
      content: chatMessages.songNameAutoInstrumental,
      inputType: 'options',
      field: 'autoGenerateName',
      options: nameOptions
    }
  ];

  // Use translated emotion options from hook
  const getEmotionOptions = (musicType: string) => getTranslatedEmotionOptions(musicType);

  // Gerar opções de solo baseado nos instrumentos selecionados
  const getSoloOptions = (instruments: string[]) => {
    // Se não tem instrumentos, só mostrar opção de não
    if (instruments.length === 0) {
      return [{ id: "none", label: soloOptions.wantSolo.find(o => o.id === 'none')?.label || '❌ No solo', description: '' }];
    }
    
    // Adicionar cada instrumento como opção de solo usando labels traduzidos
    return instruments.map(instId => {
      const inst = instrumentOptions.find(i => i.id === instId);
      return { id: instId, label: inst?.label || instId };
    });
  };

  // Extrair palavras-chave da história para sugestões
  const extractKeywords = (story: string): string[] => {
    if (!story) return [];
    
    // Palavras comuns para ignorar
    const stopWords = ['a', 'o', 'e', 'de', 'da', 'do', 'que', 'em', 'para', 'com', 'um', 'uma', 'os', 'as', 'no', 'na', 'por', 'mais', 'mas', 'foi', 'ser', 'tem', 'seu', 'sua', 'ele', 'ela', 'isso', 'esse', 'essa', 'como', 'quando', 'muito', 'nos', 'já', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'têm', 'numa', 'pelos', 'elas', 'qual', 'nós', 'lhe', 'deles', 'essas', 'esses', 'pelas', 'este', 'dele', 'tu', 'te', 'vocês', 'vos', 'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso', 'nossa', 'nossos', 'nossas', 'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'aquilo'];
    
    const words = story
      .toLowerCase()
      .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Encontrar nomes próprios (começam com maiúscula no texto original)
    const properNouns = story
      .split(/\s+/)
      .filter(word => /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+/.test(word) && word.length > 2)
      .map(w => w.replace(/[^\wáàâãéèêíïóôõöúçñ]/g, ''));
    
    // Contar frequência
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Priorizar nomes próprios e palavras mais frequentes
    const uniqueWords = [...new Set([...properNouns, ...Object.keys(wordCount).sort((a, b) => wordCount[b] - wordCount[a])])];
    
    return uniqueWords.slice(0, 8);
  };

  const addBotMessage = (msg: Omit<ChatMessage, 'id'>, targetStep?: number) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const newMsg: ChatMessage = {
        ...msg,
        id: `msg-${Date.now()}`
      };
      
      // Se for pergunta de emoção, preencher opções dinamicamente
      if (msg.field === 'emotion') {
        newMsg.options = getEmotionOptions(formData.musicType);
        newMsg.content = formData.musicType === 'parodia' 
          ? chatMessages.emotionParody
          : chatMessages.emotion;
      }
      
      // Se for step 5 (qual instrumento terá solo), preencher com instrumentos selecionados
      // Usar targetStep se fornecido, senão usar currentStep
      const stepToCheck = targetStep ?? currentStep;
      if (msg.field === 'soloInstrument' && stepToCheck === 5) {
        const soloInstrumentOptions = formData.instruments.map(instId => {
          const inst = instrumentOptions.find(i => i.id === instId);
          return { id: instId, label: inst?.label || instId };
        });
        newMsg.options = soloInstrumentOptions.length > 0 
          ? soloInstrumentOptions 
          : [{ id: "piano", label: t('steps.instruments.piano', '🎹 Piano/Keyboard') }];
      }
      
      setMessages(prev => [...prev, newMsg]);
    }, 800);
  };

  const addUserMessage = (content: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content
    };
    setMessages(prev => [...prev, userMsg]);
  };

  // Mapear steps para o fluxo correto
  // NOTA: O chatFlow é um array linear. Os "steps lógicos" 30-35 correspondem aos índices 22-27 do array.
  const getNextStep = (current: number, data: BriefingFormData): number => {
    // Step 0: isInstrumental -> depende da escolha
    if (current === 0) {
      if (data.hasCustomLyric) return 22; // Vai para fluxo "já tenho letra" (índice 22 do array)
      return 1; // musicType
    }
    
    // Step 1: musicType
    if (current === 1) {
      // Se é motivacional e cantada, vai para fluxo motivacional
      if (!data.isInstrumental && data.musicType === 'motivacional') {
        return 34; // Vai para fluxo motivacional (momento de uso)
      }
      // Se é religiosa e cantada, vai para fluxo gospel
      if (!data.isInstrumental && data.musicType === 'religiosa') {
        return 44; // Vai para fluxo gospel (contexto espiritual)
      }
      // Se é infantil e cantada, vai para fluxo infantil
      if (!data.isInstrumental && data.musicType === 'infantil') {
        return 60; // Vai para fluxo infantil (faixa etária)
      }
      // Se é corporativa e cantada, perguntar formato (institucional vs jingle)
      if (!data.isInstrumental && data.musicType === 'corporativa') {
        return 31; // Vai para formato corporativo
      }
      // Se é trilha sonora (instrumental ou vocal), vai para fluxo especializado
      if (data.musicType === 'trilha') {
        return 70; // Vai para fluxo trilha sonora
      }
      return data.isInstrumental ? 2 : 10; // Instrumental vai para 2, Cantada vai para 10
    }
    
    // FLUXO JINGLE/CORPORATIVO (31-33)
    if (current === 31) {
      if (data.corporateFormat === 'jingle') {
        return 32; // Jingle vai para contactInfo
      }
      return 10; // Institucional continua fluxo normal (emotion)
    }
    if (current === 32) return 33; // contactInfo -> callToAction
    if (current === 33) return 10; // callToAction -> emotion (continua fluxo)
    
    // FLUXO MOTIVACIONAL (34-43)
    // 34: moment, 35: emotion, 36: motivationalIntensity, 37: style, 38: narrative, 39: perspective, 40: story, 41: mandatoryWords, 42: voiceType, 43: autoGenerateName
    if (data.musicType === 'motivacional' && !data.isInstrumental) {
      if (current === 34) return 35; // moment -> emotion
      if (current === 35) return 36; // emotion -> motivationalIntensity
      if (current === 36) return 37; // motivationalIntensity -> style
      if (current === 37) return 38; // style -> narrative
      if (current === 38) {
        // Se narrativa inclui fala, forçar monólogo
        if (['cantada_monologue', 'mais_falada', 'narrador'].includes(data.motivationalNarrative || '')) {
          // Atualizar data com hasMonologue (será feito no handleOptionSelect)
        }
        return 39; // narrative -> perspective
      }
      if (current === 39) return 40; // perspective -> story
      if (current === 40) return 41; // story -> mandatoryWords
      if (current === 41) return 42; // mandatoryWords -> voiceType
      if (current === 42) return 43; // voiceType -> autoGenerateName
      if (current === 43) {
        return data.autoGenerateName ? 100 : 19; // Se auto, vai para confirmação; senão pede nome
      }
    }
    
    // FLUXO GOSPEL/RELIGIOSO (44-53)
    // 44: context, 45: emotion, 46: intensity, 47: style, 48: narrative, 49: perspective, 50: biblicalReference, 51: story, 52: voiceType, 53: autoGenerateName
    if (data.musicType === 'religiosa' && !data.isInstrumental) {
      if (current === 44) return 45; // context -> emotion
      if (current === 45) return 46; // emotion -> intensity
      if (current === 46) return 47; // intensity -> style
      if (current === 47) return 48; // style -> narrative
      if (current === 48) {
        // Músicas gospel SEMPRE começam com monólogo espiritual
        // (será setado no handleOptionSelect quando selecionar qualquer narrativa)
        return 49; // narrative -> perspective
      }
      if (current === 49) return 50; // perspective -> biblicalReference
      if (current === 50) return 51; // biblicalReference -> story
      if (current === 51) return 52; // story -> voiceType
      if (current === 52) return 53; // voiceType -> autoGenerateName
      if (current === 53) {
        return data.autoGenerateName ? 100 : 19; // Se auto, vai para confirmação; senão pede nome
      }
    }
    
    // FLUXO INFANTIL (60-69)
    // 60: ageGroup, 61: objective, 62: theme, 63: mood, 64: style, 65: interaction, 66: narrative, 67: story, 68: voiceType, 69: autoGenerateName
    if (data.musicType === 'infantil' && !data.isInstrumental) {
      if (current === 60) return 61; // ageGroup -> objective
      if (current === 61) return 62; // objective -> theme
      if (current === 62) return 63; // theme -> mood
      if (current === 63) return 64; // mood -> style
      if (current === 64) return 65; // style -> interaction
      if (current === 65) return 66; // interaction -> narrative
      if (current === 66) return 67; // narrative -> story
      if (current === 67) return 68; // story -> voiceType
      if (current === 68) return 69; // voiceType -> autoGenerateName
      if (current === 69) {
        return data.autoGenerateName ? 100 : 19; // Se auto, vai para confirmação; senão pede nome
      }
    }
    
    // FLUXO TRILHA SONORA (70-78)
    // 70: usage, 71: emotion, 72: dynamics, 73: style, 74: rhythm, 75: voice, 76: scene, 77: language, 78: autoGenerateName
    if (data.musicType === 'trilha') {
      if (current === 70) return 71; // usage -> emotion
      if (current === 71) return 72; // emotion -> dynamics
      if (current === 72) return 73; // dynamics -> style
      if (current === 73) return 74; // style -> rhythm
      if (current === 74) return 75; // rhythm -> voice
      if (current === 75) {
        // Se tem voz falada ou etérea, perguntar idioma
        if (['monologo_falado', 'voz_eterea'].includes(data.soundtrackVoice || '')) {
          return 77; // voice -> language
        }
        return 76; // voice -> scene (descrição opcional)
      }
      if (current === 76) return 78; // scene -> autoGenerateName
      if (current === 77) return 76; // language -> scene
      if (current === 78) {
        return data.autoGenerateName ? 100 : 21; // Se auto, vai para confirmação; senão pede nome
      }
    }
    
    // FLUXO "JÁ TENHO A LETRA" (índices 22-30 do chatFlow)
    if (data.hasCustomLyric) {
      if (current === 22) return 23; // customLyricText -> hasCustomStylePrompt
      if (current === 23) {
        // Se tem style pronto, vai para inserir style. Se não, pula para musicType
        return data.hasCustomStylePrompt ? 24 : 25;
      }
      if (current === 24) return 30; // customStylePrompt -> songName (pula perguntas de estilo)
      if (current === 25) return 26; // musicType -> voiceType
      if (current === 26) return 27; // voiceType -> style
      if (current === 27) return 28; // style -> rhythm
      if (current === 28) return 29; // rhythm -> atmosphere
      if (current === 29) return 30; // atmosphere -> songName
      if (current === 30) return 100; // songName -> confirmação
    }
    
    // FLUXO INSTRUMENTAL (2-9, 20-21)
    // Steps: 2-style, 3-instruments, 4-wantSolo, 5-soloInstrument, 6-soloMoment, 7-rhythm, 8-atmosphere, 9-story
    if (data.isInstrumental) {
      if (current === 2) return 3; // style -> instruments
      if (current === 3) return 4; // instruments -> wantSolo
      if (current === 4) {
        // Se escolheu "want_solo", vai perguntar qual instrumento. Se "none", pula para rhythm
        return data.soloInstrument === 'want_solo' ? 5 : 7;
      }
      if (current === 5) return 6; // soloInstrument -> soloMoment
      if (current === 6) return 7; // soloMoment -> rhythm
      if (current === 7) return 8; // rhythm -> atmosphere
      if (current === 8) return 9; // atmosphere -> story
      if (current === 9) return 20; // story -> autoGenerateName (instrumental)
      if (current === 20) {
        return data.autoGenerateName ? 100 : 21; // Se auto, vai para confirmação
      }
      if (current === 21) return 100; // songName -> confirmação
    }
    
    // FLUXO CANTADA (10-19)
    if (!data.isInstrumental) {
      if (current === 10) return 11; // emotion -> emotionIntensity
      if (current === 11) return 12; // emotionIntensity -> story
      if (current === 12) return 13; // story -> mandatoryWords
      if (current === 13) return 14; // mandatoryWords -> voiceType
      if (current === 14) return 15; // voiceType -> style
      if (current === 15) return 16; // style -> rhythm
      if (current === 16) return 17; // rhythm -> atmosphere
      if (current === 17) return 18; // atmosphere -> autoGenerateName
      if (current === 18) {
        return data.autoGenerateName ? 100 : 19; // Se auto, vai para confirmação
      }
      if (current === 19) return 100; // songName -> confirmação
    }
    
    return current + 1;
  };

  const handleGoBack = () => {
    if (stepHistory.length === 0) return;
    
    // Remover a última mensagem do bot e a resposta do usuário
    setMessages(prev => {
      const newMessages = [...prev];
      // Remover últimas 2 mensagens (resposta + pergunta atual se existir)
      if (newMessages.length >= 2) {
        newMessages.pop();
        newMessages.pop();
      }
      return newMessages;
    });
    
    const previousStep = stepHistory[stepHistory.length - 1];
    setStepHistory(prev => prev.slice(0, -1));
    setCurrentStep(previousStep);
    setShowCustomStyleInput(false);
    setSelectedSuggestions([]);
    setSelectedInstruments([]);
    
    setTimeout(() => {
      addBotMessage(chatFlow[previousStep]);
    }, 300);
  };

  const handleOptionSelect = (option: { id: string; label: string }) => {
    const currentMsg = messages[messages.length - 1];
    if (!currentMsg?.field) {
      // Handler para continue/restart na tela inicial
      if (option.id === 'continue') {
        const savedStep = getSavedStep(formData);
        setMessages([]);
        if (savedStep >= 100) {
          showConfirmationScreen(formData);
        } else {
          setCurrentStep(savedStep);
          setTimeout(() => addBotMessage(chatFlow[savedStep]), 300);
        }
        return;
      }
      if (option.id === 'restart') {
        setFormData(initialFormData);
        clearSavedBriefing();
        setMessages([]);
        setCurrentStep(0);
        setTimeout(() => addBotMessage(chatFlow[0]), 300);
        return;
      }
      return;
    }

    const field = currentMsg.field;
    let displayValue = option.label;

    // Handle isInstrumental / custom_lyric
    if (field === 'isInstrumental') {
      const isInstrumental = option.id === 'instrumental';
      const hasCustomLyric = option.id === 'custom_lyric';
      
      setFormData(prev => ({ 
        ...prev, 
        isInstrumental,
        hasCustomLyric
      }));
      addUserMessage(displayValue);
      setStepHistory(prev => [...prev, currentStep]);
      
      const nextStep = getNextStep(currentStep, { ...formData, isInstrumental, hasCustomLyric });
      setCurrentStep(nextStep);
      setTimeout(() => addBotMessage(chatFlow[nextStep]), 500);
      return;
    }

    // Handle style "outros" option
    if (field === 'style' && option.id === 'outros') {
      setShowCustomStyleInput(true);
      return;
    }

    // Handle hasCustomStylePrompt
    if (field === 'hasCustomStylePrompt') {
      const hasStylePrompt = option.id === 'yes';
      setFormData(prev => ({ ...prev, hasCustomStylePrompt: hasStylePrompt }));
      addUserMessage(displayValue);
      setStepHistory(prev => [...prev, currentStep]);
      
      const updatedFormData = { ...formData, hasCustomStylePrompt: hasStylePrompt };
      
      if (isEditingSingleField) {
        setIsEditingSingleField(false);
        setEditingFieldStep(null);
        setTimeout(() => {
          showConfirmationScreen(updatedFormData);
        }, 500);
        return;
      }
      
      const nextStep = getNextStep(currentStep, updatedFormData);
      setCurrentStep(nextStep);
      setTimeout(() => addBotMessage(chatFlow[nextStep]), 500);
      return;
    }

    // Handle corporateFormat - se for jingle, ativar monólogo automaticamente
    if (field === 'corporateFormat') {
      const isJingle = option.id === 'jingle';
      setFormData(prev => ({ 
        ...prev, 
        corporateFormat: option.id as 'institucional' | 'jingle',
        hasMonologue: isJingle, // Jingles sempre têm monólogo
        monologuePosition: isJingle ? 'outro' : '' // Monólogo no final para jingles
      }));
      addUserMessage(displayValue);
      setStepHistory(prev => [...prev, currentStep]);
      
      const updatedFormData = { 
        ...formData, 
        corporateFormat: option.id as 'institucional' | 'jingle',
        hasMonologue: isJingle,
        monologuePosition: isJingle ? 'outro' : ''
      };
      
      if (isEditingSingleField) {
        setIsEditingSingleField(false);
        setEditingFieldStep(null);
        setTimeout(() => {
          showConfirmationScreen(updatedFormData);
        }, 500);
        return;
      }
      
      const nextStep = getNextStep(currentStep, updatedFormData);
      setCurrentStep(nextStep);
      setTimeout(() => addBotMessage(chatFlow[nextStep]), 500);
      return;
    }

    // Handle motivationalNarrative - se incluir fala, ativar monólogo automaticamente
    if (field === 'motivationalNarrative') {
      const hasSpokenParts = ['cantada_monologue', 'mais_falada', 'narrador'].includes(option.id);
      setFormData(prev => ({ 
        ...prev, 
        motivationalNarrative: option.id,
        hasMonologue: hasSpokenParts,
        monologuePosition: hasSpokenParts ? 'bridge' : ''
      }));
      addUserMessage(displayValue);
      setStepHistory(prev => [...prev, currentStep]);
      
      const updatedFormData = { 
        ...formData, 
        motivationalNarrative: option.id,
        hasMonologue: hasSpokenParts,
        monologuePosition: hasSpokenParts ? 'bridge' : ''
      };
      
      if (isEditingSingleField) {
        setIsEditingSingleField(false);
        setEditingFieldStep(null);
        setTimeout(() => {
          showConfirmationScreen(updatedFormData);
        }, 500);
        return;
      }
      
      const nextStep = getNextStep(currentStep, updatedFormData);
      setCurrentStep(nextStep);
      setTimeout(() => addBotMessage(chatFlow[nextStep]), 500);
      return;
    }

    // Handle gospelNarrative - músicas gospel SEMPRE começam com monólogo espiritual
    if (field === 'gospelNarrative') {
      // Gospel music always has a spiritual monologue at the beginning
      setFormData(prev => ({ 
        ...prev, 
        gospelNarrative: option.id,
        hasMonologue: true, // Gospel always has monologue
        monologuePosition: 'intro' // Monologue at the start for reverent opening
      }));
      addUserMessage(displayValue);
      setStepHistory(prev => [...prev, currentStep]);
      
      const updatedFormData = { 
        ...formData, 
        gospelNarrative: option.id,
        hasMonologue: true,
        monologuePosition: 'intro'
      };
      
      if (isEditingSingleField) {
        setIsEditingSingleField(false);
        setEditingFieldStep(null);
        setTimeout(() => {
          showConfirmationScreen(updatedFormData);
        }, 500);
        return;
      }
      
      const nextStep = getNextStep(currentStep, updatedFormData);
      setCurrentStep(nextStep);
      setTimeout(() => addBotMessage(chatFlow[nextStep]), 500);
      return;
    }

    // Handle special cases
    if (field === 'autoGenerateName') {
      const isAuto = option.id === 'auto';
      setFormData(prev => ({ ...prev, autoGenerateName: isAuto, songName: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: option.id }));
    }

    addUserMessage(displayValue);
    setStepHistory(prev => [...prev, currentStep]);

    const updatedFormData = field === 'autoGenerateName' 
      ? { ...formData, autoGenerateName: option.id === 'auto', songName: '' }
      : { ...formData, [field]: option.id };
    
    // Se estiver editando um único campo, voltar para confirmação
    if (isEditingSingleField) {
      setFormData(updatedFormData as BriefingFormData);
      setIsEditingSingleField(false);
      setEditingFieldStep(null);
      setTimeout(() => {
        showConfirmationScreen(updatedFormData as BriefingFormData);
      }, 500);
      return;
    }

    const nextStep = getNextStep(currentStep, updatedFormData);
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep], nextStep);
      }, 500);
    } else {
      showConfirmationScreen(updatedFormData as BriefingFormData);
    }
  };

  const handleCustomStyleSubmit = () => {
    const customStyle = inputValue.trim();
    if (!customStyle) {
      toast({
        title: 'Digite o estilo musical',
        variant: 'destructive'
      });
      return;
    }

    setFormData(prev => ({ ...prev, style: 'outros', customStyle }));
    addUserMessage(`✨ ${customStyle}`);
    setInputValue("");
    setShowCustomStyleInput(false);
    setStepHistory(prev => [...prev, currentStep]);

    const updatedFormData = { ...formData, style: 'outros', customStyle };

    // Se estiver editando um único campo, voltar para confirmação
    if (isEditingSingleField) {
      setIsEditingSingleField(false);
      setEditingFieldStep(null);
      setTimeout(() => {
        showConfirmationScreen(updatedFormData);
      }, 500);
      return;
    }

    const nextStep = getNextStep(currentStep, updatedFormData);
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      showConfirmationScreen(updatedFormData);
    }
  };

  const handleYesNo = (yes: boolean) => {
    const currentMsg = messages[messages.length - 1];
    if (!currentMsg?.field) return;

    setFormData(prev => ({ ...prev, [currentMsg.field!]: yes }));
    addUserMessage(yes ? "✅ Sim" : "❌ Não");
    setStepHistory(prev => [...prev, currentStep]);

    const updatedFormData = { ...formData, [currentMsg.field]: yes };

    // Se estiver editando um único campo, voltar para confirmação
    if (isEditingSingleField) {
      setIsEditingSingleField(false);
      setEditingFieldStep(null);
      setTimeout(() => {
        showConfirmationScreen(updatedFormData as BriefingFormData);
      }, 500);
      return;
    }

    const nextStep = getNextStep(currentStep, updatedFormData);
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      showConfirmationScreen(updatedFormData as BriefingFormData);
    }
  };

  const handleIntensitySelect = (value: number) => {
    setFormData(prev => ({ ...prev, emotionIntensity: value }));
    addUserMessage(`${value}/5 - ${intensityLabels[value - 1]}`);
    setStepHistory(prev => [...prev, currentStep]);

    const updatedFormData = { ...formData, emotionIntensity: value };

    // Se estiver editando um único campo, voltar para confirmação
    if (isEditingSingleField) {
      setIsEditingSingleField(false);
      setEditingFieldStep(null);
      setTimeout(() => {
        showConfirmationScreen(updatedFormData);
      }, 500);
      return;
    }

    const nextStep = getNextStep(currentStep, updatedFormData);
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    }
  };

  const handleSuggestionToggle = (word: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(word) 
        ? prev.filter(w => w !== word)
        : [...prev, word]
    );
  };

  const handleInstrumentToggle = (instId: string) => {
    // Se clicou em "Outro", mostrar input customizado
    if (instId === 'outro') {
      setShowCustomInstrumentInput(true);
      return;
    }
    
    setSelectedInstruments(prev => 
      prev.includes(instId) 
        ? prev.filter(i => i !== instId)
        : [...prev, instId]
    );
  };

  const handleAddCustomInstrument = () => {
    const value = customInstrumentValue.trim();
    if (!value) {
      toast({
        title: 'Digite o nome do instrumento',
        variant: 'destructive'
      });
      return;
    }
    
    // Adicionar instrumento personalizado (prefixado com "custom:")
    const customId = `custom:${value}`;
    if (!selectedInstruments.includes(customId)) {
      setSelectedInstruments(prev => [...prev, customId]);
    }
    
    setCustomInstrumentValue("");
    setShowCustomInstrumentInput(false);
    
    toast({
      title: '✓ Instrumento adicionado',
      description: value
    });
  };

  const handleInstrumentsSubmit = () => {
    if (selectedInstruments.length === 0) {
      toast({
        title: 'Selecione ao menos um instrumento',
        variant: 'destructive'
      });
      return;
    }

    // Map instrument IDs to labels, handling custom instruments
    const labels = selectedInstruments
      .map(id => {
        if (id.startsWith('custom:')) {
          return `✏️ ${id.replace('custom:', '')}`;
        }
        return INSTRUMENT_OPTIONS.find(i => i.id === id)?.label || id;
      })
      .join(', ');
    
    setFormData(prev => ({ ...prev, instruments: selectedInstruments }));
    addUserMessage(labels);
    setStepHistory(prev => [...prev, currentStep]);
    
    const updatedFormData = { ...formData, instruments: selectedInstruments };
    
    // Se estiver editando um único campo, voltar para confirmação
    if (isEditingSingleField) {
      setIsEditingSingleField(false);
      setEditingFieldStep(null);
      setSelectedInstruments([]);
      setTimeout(() => {
        showConfirmationScreen(updatedFormData);
      }, 500);
      return;
    }

    const nextStep = getNextStep(currentStep, updatedFormData);
    setCurrentStep(nextStep);
    setSelectedInstruments([]);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    }
  };

  const handleWordSuggestionsSubmit = () => {
    const manualWords = inputValue.trim();
    const allWords = [...selectedSuggestions];
    if (manualWords) {
      allWords.push(...manualWords.split(',').map(w => w.trim()).filter(Boolean));
    }
    
    const finalValue = allWords.join(', ');
    setFormData(prev => ({ ...prev, mandatoryWords: finalValue }));
    addUserMessage(finalValue || "(nenhum)");
    setInputValue("");
    setSelectedSuggestions([]);
    setStepHistory(prev => [...prev, currentStep]);

    const updatedFormData = { ...formData, mandatoryWords: finalValue };

    // Se estiver editando um único campo, voltar para confirmação
    if (isEditingSingleField) {
      setIsEditingSingleField(false);
      setEditingFieldStep(null);
      setTimeout(() => {
        showConfirmationScreen(updatedFormData);
      }, 500);
      return;
    }

    const nextStep = getNextStep(currentStep, updatedFormData);
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    }
  };

  const handleTextSubmit = () => {
    const currentMsg = messages[messages.length - 1];
    if (!currentMsg?.field) return;

    const value = inputValue.trim();
    const field = currentMsg.field;

    // Validação para história
    if (field === 'story' && value.length < 20) {
      toast({
        title: 'Contexto muito curto',
        description: formData.isInstrumental 
          ? 'Conte mais detalhes para uma música mais personalizada (mínimo 20 caracteres).'
          : 'Conte mais detalhes para uma letra melhor (mínimo 20 caracteres).',
        variant: 'destructive'
      });
      return;
    }

    // Validação para letra customizada
    if (field === 'customLyricText' && value.length < 50) {
      toast({
        title: 'Letra muito curta',
        description: 'Cole sua letra completa (mínimo 50 caracteres).',
        variant: 'destructive'
      });
      return;
    }

    // Campos opcionais podem ficar vazios
    if (!value && (field === 'mandatoryWords' || field === 'restrictedWords' || field === 'instrumentationNotes')) {
      addUserMessage("(nenhum)");
    } else if (!value && field === 'songName') {
      toast({
        title: 'Digite o nome da música',
        variant: 'destructive'
      });
      return;
    } else {
      addUserMessage(value || "(vazio)");
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    setInputValue("");
    setStepHistory(prev => [...prev, currentStep]);

    const updatedFormData = { ...formData, [field]: value };

    // Se estiver editando um único campo, voltar para confirmação
    if (isEditingSingleField) {
      setIsEditingSingleField(false);
      setEditingFieldStep(null);
      setTimeout(() => {
        showConfirmationScreen(updatedFormData as BriefingFormData);
      }, 500);
      return;
    }

    const nextStep = getNextStep(currentStep, updatedFormData);
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      showConfirmationScreen(updatedFormData as BriefingFormData);
    }
  };

  const showConfirmationScreen = async (data: BriefingFormData) => {
    setFormData(data);
    setIsTyping(true);
    
    // Check credits immediately and show modal if none available
    try {
      const { data: creditsData } = await supabase.functions.invoke('check-credits');
      const hasAnyCredit = creditsData?.has_credits || 
                           creditsData?.total_available > 0 || 
                           creditsData?.preview_credit_available === true;
      if (!hasAnyCredit) {
        // No credits - show modal immediately with confirmation screen
        setIsTyping(false);
        setShowConfirmation(true);
        // Small delay to ensure confirmation screen renders first
        setTimeout(() => {
          setShowNoCreditModal(true);
        }, 100);
        return;
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      // Continue to confirmation even if check fails
    }
    
    setTimeout(() => {
      setIsTyping(false);
      setShowConfirmation(true);
    }, 800);
  };

  const handleEditField = (step: number) => {
    setShowConfirmation(false);
    setCurrentStep(step);
    setStepHistory([]);
    setMessages([]);
    setSelectedInstruments([]);
    setIsEditingSingleField(true);
    setEditingFieldStep(step);
    
    // Para instrumentos, restaurar a seleção atual
    if (step === 3 && formData.instruments.length > 0) {
      setSelectedInstruments(formData.instruments);
    }
    
    // Mostrar apenas a pergunta específica
    setTimeout(() => {
      addBotMessage(chatFlow[step], step);
    }, 300);
  };

  const checkWhatsAppAndFinish = async () => {
    // Verifica se o usuário já tem WhatsApp cadastrado
    if (profile?.whatsapp) {
      finishBriefing();
      return;
    }

    // Verificar novamente do banco (pode ter sido atualizado)
    if (user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('whatsapp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.whatsapp) {
        finishBriefing();
        return;
      }
    }

    // Não tem WhatsApp, mostrar modal
    setPendingFinish(true);
    setShowWhatsAppModal(true);
  };

  const handleWhatsAppConfirm = () => {
    setShowWhatsAppModal(false);
    if (pendingFinish) {
      setPendingFinish(false);
      // Se for modo rápido, usar os dados guardados
      if (isQuickMode && quickModeFormData) {
        finishBriefingWithData(quickModeFormData);
        setQuickModeFormData(null);
      } else {
        finishBriefing();
      }
    }
  };

  const finishBriefing = async () => {
    setIsCreatingOrder(true);
    const data = formData;
    
    // Limpar auto-save ao finalizar
    clearSavedBriefing();
    
    // Criar ordem no banco primeiro
    // Para jingles, forçar hasMonologue=true e adicionar contactInfo ao story
    const isJingle = data.corporateFormat === 'jingle';
    const storyWithJingleInfo = isJingle 
      ? `${data.story}\n\n[INFORMAÇÕES DE CONTATO PARA O JINGLE]\n${data.contactInfo}\n\n[CHAMADA PARA AÇÃO]\n${data.callToAction}`
      : data.story;
    
    const briefingData = {
      isInstrumental: data.isInstrumental,
      hasCustomLyric: data.hasCustomLyric,
      customLyricText: data.customLyricText,
      hasCustomStylePrompt: data.hasCustomStylePrompt,
      customStylePrompt: data.customStylePrompt,
      isConfidential: data.isConfidential,
      musicType: data.musicType,
      emotion: data.emotion,
      emotionIntensity: data.emotionIntensity,
      story: storyWithJingleInfo,
      structure: ['intro', 'verse', 'chorus', 'verse', 'bridge', 'chorus', 'outro'],
      hasMonologue: isJingle ? true : data.hasMonologue, // Jingles sempre têm monólogo
      monologuePosition: isJingle ? 'outro' : (data.monologuePosition || 'bridge'),
      mandatoryWords: data.mandatoryWords,
      restrictedWords: data.restrictedWords,
      voiceType: data.voiceType,
      style: data.style === 'outros' ? data.customStyle : data.style,
      rhythm: data.rhythm,
      atmosphere: data.atmosphere,
      songName: data.songName,
      autoGenerateName: data.autoGenerateName,
      // Campos instrumentais
      instruments: data.instruments,
      soloInstrument: data.soloInstrument,
      soloMoment: data.soloMoment,
      instrumentationNotes: data.instrumentationNotes,
      // Campos de jingle
      corporateFormat: data.corporateFormat,
      contactInfo: data.contactInfo,
      callToAction: data.callToAction,
      plan: userPlan,
      lgpdConsent: true
    };

    // Criar ordem no Supabase
    try {
      // Buscar preço do plano selecionado
      let orderAmount = 990; // Default: R$ 9,90
      const effectivePlanId = briefingData.hasCustomLyric 
        ? 'single_custom_lyric' 
        : briefingData.isInstrumental 
          ? (selectedPlanId?.includes('instrumental') ? selectedPlanId : `${selectedPlanId || 'single'}_instrumental`)
          : (selectedPlanId || 'single');
      
      const { data: pricingData } = await supabase
        .from('pricing_config')
        .select('price_promo_cents, price_cents')
        .eq('id', effectivePlanId)
        .single();
      
      if (pricingData) {
        orderAmount = pricingData.price_promo_cents || pricingData.price_cents;
      } else {
        // Fallback: buscar plano base se variante não encontrada
        const basePlanId = selectedPlanId?.replace('_instrumental', '') || 'single';
        const { data: basePricing } = await supabase
          .from('pricing_config')
          .select('price_promo_cents, price_cents')
          .eq('id', basePlanId)
          .single();
        
        if (basePricing) {
          const basePrice = basePricing.price_promo_cents || basePricing.price_cents;
          // Aplicar 20% desconto para instrumental
          orderAmount = briefingData.isInstrumental 
            ? Math.round(basePrice * 0.8 / 100) * 100 - 10 
            : basePrice;
        }
      }
      
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          status: 'AWAITING_PAYMENT',
          payment_status: 'PENDING',
          amount: orderAmount, // Incluir amount na criação
          plan_id: selectedPlanId, // Save the selected plan for credit tracking
          is_instrumental: briefingData.isInstrumental,
          has_custom_lyric: briefingData.hasCustomLyric,
          is_confidential: briefingData.isConfidential,
          music_type: briefingData.musicType,
          music_style: briefingData.style,
          emotion: briefingData.emotion,
          emotion_intensity: briefingData.emotionIntensity,
          story: briefingData.hasCustomLyric ? briefingData.customLyricText : briefingData.story,
          has_monologue: briefingData.hasMonologue,
          monologue_position: briefingData.monologuePosition,
          mandatory_words: briefingData.mandatoryWords,
          restricted_words: briefingData.restrictedWords,
          voice_type: briefingData.voiceType,
          rhythm: briefingData.rhythm,
          atmosphere: briefingData.atmosphere,
          music_structure: JSON.stringify(briefingData.structure),
          // Campos instrumentais
          instruments: briefingData.instruments.length > 0 ? briefingData.instruments : null,
          solo_instrument: briefingData.soloInstrument || null,
          solo_moment: briefingData.soloMoment || null,
          instrumentation_notes: briefingData.instrumentationNotes || null,
          // Título da música (para instrumental, vocal e letra própria)
          song_title: briefingData.hasCustomLyric ? (briefingData.songName || null) : (briefingData.autoGenerateName ? null : briefingData.songName || null),
          // Style prompt customizado (se usuário fornecer)
          style_prompt: briefingData.hasCustomStylePrompt && briefingData.customStylePrompt ? briefingData.customStylePrompt : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Salvar dados completos no localStorage para uso posterior
      localStorage.setItem('briefingData', JSON.stringify({ ...briefingData, orderId: orderData.id }));
      
      // Determinar tipo de crédito necessário
      const orderType = briefingData.isInstrumental 
        ? 'instrumental' 
        : briefingData.hasCustomLyric 
          ? 'custom_lyric' 
          : 'vocal';
      
      // Verificar se usuário tem créditos compatíveis disponíveis
      const { data: creditsData } = await supabase.functions.invoke('check-credits', {
        body: { orderType }
      });
      
      if (creditsData?.has_credits && creditsData?.total_available > 0) {
        // Consumir crédito automaticamente SEM modal
        const result = await supabase.functions.invoke('use-credit', {
          body: { orderId: orderData.id }
        });
        
        if (result.error || !result.data?.success) {
          // Erro ao usar crédito, ir para checkout
          console.error('Error using credit:', result.error || result.data?.error);
          const planId = selectedPlanId || 'single';
          navigate(`/checkout/${orderData.id}?planId=${planId}`);
          setIsCreatingOrder(false);
          return;
        }
        
        // Crédito consumido! Processar baseado no modo
        toast({
          title: '✨ Crédito utilizado!',
          description: 'Gerando sua música...',
        });
        
        await processOrderAfterCredit(orderData.id, briefingData);
        setIsCreatingOrder(false);
        return;
      }

      // Sem créditos - mostrar modal para ir ao checkout
      setPendingOrderId(orderData.id);
      setIsCreatingOrder(false);
      setShowNoCreditModal(true);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
      setIsCreatingOrder(false);
    }
  };

  // Função para processar ordem após consumo do crédito
  const processOrderAfterCredit = async (orderId: string, briefing: {
    isInstrumental: boolean;
    hasCustomLyric?: boolean;
    story?: string;
    musicType?: string;
    emotion?: string;
    emotionIntensity?: number;
    style?: string;
    rhythm?: string;
    atmosphere?: string;
    voiceType?: string;
    hasMonologue?: boolean;
    monologuePosition?: string;
    mandatoryWords?: string;
    restrictedWords?: string;
    structure?: string[];
    [key: string]: any;
  }) => {
    try {
      if (briefing.isInstrumental) {
        // Instrumental: gerar style prompt e ir para dashboard
        console.log('Generating style prompt for instrumental order...');
        await supabase.functions.invoke('generate-style-prompt', {
          body: {
            orderId,
            isInstrumental: true,
            briefing: {
              ...briefing,
              instruments: formData.instruments || [],
              soloInstrument: formData.soloInstrument || null,
              soloMoment: formData.soloMoment || null,
              instrumentationNotes: formData.instrumentationNotes || ''
            }
          }
        });
        toast({
          title: '🎹 Música instrumental em produção!',
          description: 'Você pode acompanhar o progresso no dashboard.',
        });
        clearSavedBriefing();
        navigate('/dashboard');
      } else if (isQuickMode) {
        // MODO RÁPIDO: Enviar pedido e ir pro dashboard imediatamente
        // O admin gera a música depois e envia pro usuário
        
        try {
          // Atualizar status do pedido
          await supabase
            .from('orders')
            .update({ 
              status: 'LYRICS_PENDING',
              payment_status: 'PAID'
            })
            .eq('id', orderId);
          
          // Disparar geração de letra em background (não esperar)
          console.log('Starting background lyrics generation for quick mode...');
          supabase.functions.invoke('generate-lyrics', {
            body: {
              orderId,
              story: briefing.story,
              briefing,
              autoApprove: true
            }
          }).catch(err => {
            console.error('Background lyrics generation error:', err);
          });
          
        } catch (err) {
          console.error('Quick mode processing error:', err);
        }
        
        // Redirecionar imediatamente para o dashboard
        toast({
          title: '🎵 ' + t('quickCreation.inProduction', 'Pedido enviado!'),
          description: t('quickCreation.deliveryNotice', 'Você receberá sua música em até 12 horas. Acompanhe no dashboard.'),
        });
        clearSavedBriefing();
        navigate('/dashboard');
      } else {
        // Modo detalhado: gerar letras e ir para página de revisão
        console.log('Generating lyrics for detailed mode...');
        await supabase.functions.invoke('generate-lyrics', {
          body: {
            orderId,
            story: briefing.story,
            briefing
          }
        });
        clearSavedBriefing();
        navigate(`/criar-musica?orderId=${orderId}`);
      }
    } catch (error) {
      console.error('Error processing order after credit:', error);
      // Em caso de erro, redirecionar para dashboard ou criar-musica
      clearSavedBriefing();
      if (briefing.isInstrumental || isQuickMode) {
        navigate('/dashboard');
      } else {
        navigate(`/criar-musica?orderId=${orderId}`);
      }
    }
  };

  // Handler para ir ao checkout ao invés de usar crédito
  const handleGoToCheckout = () => {
    setShowNoCreditModal(false);
    
    // If we have a pending order, go to checkout with that order
    if (pendingOrderId) {
      const planId = selectedPlanId || 'single';
      navigate(`/checkout/${pendingOrderId}?planId=${planId}`);
      return;
    }
    
    // Otherwise, go to plans page to buy credits
    navigate('/planos');
  };

  const getFieldLabel = (field: string, value: string | boolean | number | string[]): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return t('confirmation.none', '(nenhum)');
      return value.map(v => {
        if (v.startsWith('custom:')) {
          return `✏️ ${v.replace('custom:', '')}`;
        }
        const inst = instrumentOptions.find(i => i.id === v);
        return inst?.label || v;
      }).join(', ');
    }

    // Use translated options from hook
    const findLabel = (options: { id: string; label: string }[], id: string) => 
      options.find(o => o.id === id)?.label || id;

    if (typeof value === 'boolean') {
      return value ? t('common:yes', 'Sim') : t('common:no', 'Não');
    }
    if (typeof value === 'number') {
      return `${value}/5 - ${intensityLabels[value - 1]}`;
    }
    
    // Map fields to their translated options
    switch (field) {
      case 'musicType':
        return findLabel(musicTypeOptions, value);
      case 'emotion':
        return findLabel(getTranslatedEmotionOptions(formData.musicType), value);
      case 'style':
        if (value === 'outros') return `✨ ${formData.customStyle}`;
        return findLabel([...styleOptions, ...instrumentalStyleOptions], value);
      case 'voiceType':
        return findLabel(voiceTypeOptions, value);
      case 'rhythm':
        return findLabel(rhythmOptions, value);
      case 'atmosphere':
        return findLabel(atmosphereOptions, value);
      case 'soloMoment':
        return findLabel(soloOptions.moment, value);
      case 'soloInstrument':
        if (value === 'none' || !value) return t('confirmation.noSolo', 'Sem solo');
        const inst = instrumentOptions.find(i => i.id === value);
        return inst?.label || value;
      default:
        return value || t('confirmation.none', '(nenhum)');
    }
  };

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

  const currentBotMessage = messages[messages.length - 1];
  const showInput = currentBotMessage?.type === 'bot' && currentBotMessage?.inputType && !showConfirmation;
  const suggestedKeywords = extractKeywords(formData.story);

  // Get plan info for display
  const currentPlanInfo = selectedPlanId ? PLAN_LABELS[selectedPlanId as keyof typeof PLAN_LABELS] : null;

  // Get credit info for plan selection badges
  const { totalVocal, totalInstrumental, hasCredits } = useCredits();
  const { previewCreditAvailable } = usePreviewCredit();
  const hasVocalCredits = totalVocal > 0;
  const hasInstrumentalCredits = totalInstrumental > 0;

  // Handler para selecionar plano
  const handlePlanSelection = (planId: string) => {
    // Atualizar URL com o planId
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('planId', planId);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    
    // Se for instrumental ou custom_lyric, ir direto para o chat
    if (planId.includes('instrumental')) {
      setSelectedPlanId(planId);
      setShowPlanSelection(false);
      setIsQuickMode(false); // Modo detalhado
      setFormData(prev => ({ ...prev, isInstrumental: true }));
      setCurrentStep(1);
      addBotMessage(chatFlow[1]);
    } else if (planId.includes('custom_lyric')) {
      setSelectedPlanId(planId);
      setShowPlanSelection(false);
      setIsQuickMode(false); // Modo detalhado
      setFormData(prev => ({ ...prev, hasCustomLyric: true }));
      setCurrentStep(22);
      addBotMessage(chatFlow[22]);
    } else {
      // Para músicas vocais, ir direto para criação rápida
      setSelectedPlanId(planId);
      setCreationMode('quick');
      setShowPlanSelection(false);
    }
  };

  // Handler para ir para modo detalhado
  const handleSwitchToDetailed = () => {
    setCreationMode('detailed');
    setIsQuickMode(false); // Modo detalhado
    // Iniciar chat normal
    addBotMessage(chatFlow[0]);
  };

  // Handler para criação rápida
  const handleQuickCreationSubmit = async (data: QuickCreationData) => {
    // Converter QuickCreationData para BriefingFormData
    const newFormData: BriefingFormData = {
      ...initialFormData,
      story: data.prompt,
      isInstrumental: data.isInstrumental,
      style: data.style,
      customStyle: data.additionalGenre || '',
      voiceType: data.voiceType || '',
      musicType: 'homenagem', // Default para criação rápida
      emotion: 'amor',        // Default para criação rápida
      rhythm: 'moderado',     // Default - valores válidos: lento, moderado, animado
      atmosphere: 'festivo',  // Default - valores válidos: intimo, festivo, melancolico, epico, leve, misterioso
      autoGenerateName: !data.songName, // Automático se não fornecer nome
      songName: data.songName || '',    // Nome da música se fornecido
      emotionIntensity: 3,    // Default
    };
    
    setFormData(newFormData);
    setIsQuickMode(true); // Marcar como modo rápido
    // NÃO setar creationMode(null) aqui - será setado em finishBriefingWithData
    setQuickModeFormData(newFormData); // Guardar para uso após WhatsApp modal
    
    // Modo rápido: pular confirmação e ir direto para criação
    // Verificar WhatsApp antes de finalizar
    if (profile?.whatsapp) {
      await finishBriefingWithData(newFormData);
    } else {
      // Verificar novamente do banco
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('whatsapp')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData?.whatsapp) {
          await finishBriefingWithData(newFormData);
          return;
        }
      }
      // Mostrar modal de WhatsApp
      setPendingFinish(true);
      setShowWhatsAppModal(true);
    }
  };
  
  // Função para finalizar briefing com formData específico (para modo rápido)
  const finishBriefingWithData = async (data: BriefingFormData) => {
    setIsCreatingOrder(true);
    setCreationMode(null); // Agora sim, quando loading já está ativo
    clearSavedBriefing();
    
    const briefingData = {
      isInstrumental: data.isInstrumental,
      hasCustomLyric: data.hasCustomLyric,
      customLyricText: data.customLyricText,
      hasCustomStylePrompt: data.hasCustomStylePrompt,
      customStylePrompt: data.customStylePrompt,
      isConfidential: data.isConfidential,
      musicType: data.musicType,
      emotion: data.emotion,
      emotionIntensity: data.emotionIntensity,
      story: data.story,
      structure: ['intro', 'verse', 'chorus', 'verse', 'bridge', 'chorus', 'outro'],
      hasMonologue: data.hasMonologue,
      monologuePosition: data.monologuePosition || 'bridge',
      mandatoryWords: data.mandatoryWords,
      restrictedWords: data.restrictedWords,
      voiceType: data.voiceType,
      style: data.style === 'outros' ? data.customStyle : data.style,
      rhythm: data.rhythm,
      atmosphere: data.atmosphere,
      songName: data.songName,
      autoGenerateName: data.autoGenerateName,
      instruments: data.instruments,
      soloInstrument: data.soloInstrument,
      soloMoment: data.soloMoment,
      instrumentationNotes: data.instrumentationNotes,
      corporateFormat: data.corporateFormat,
      contactInfo: data.contactInfo,
      callToAction: data.callToAction,
      plan: userPlan,
      lgpdConsent: true
    };

    try {
      // Buscar preço do plano selecionado
      let orderAmount = 990; // Default: R$ 9,90
      const effectivePlanId = briefingData.isInstrumental 
        ? (selectedPlanId?.includes('instrumental') ? selectedPlanId : `${selectedPlanId || 'single'}_instrumental`)
        : (selectedPlanId || 'single');
      
      const { data: pricingData } = await supabase
        .from('pricing_config')
        .select('price_promo_cents, price_cents')
        .eq('id', effectivePlanId)
        .single();
      
      if (pricingData) {
        orderAmount = pricingData.price_promo_cents || pricingData.price_cents;
      } else {
        // Fallback: buscar plano base
        const basePlanId = selectedPlanId?.replace('_instrumental', '') || 'single';
        const { data: basePricing } = await supabase
          .from('pricing_config')
          .select('price_promo_cents, price_cents')
          .eq('id', basePlanId)
          .single();
        
        if (basePricing) {
          const basePrice = basePricing.price_promo_cents || basePricing.price_cents;
          orderAmount = briefingData.isInstrumental 
            ? Math.round(basePrice * 0.8 / 100) * 100 - 10 
            : basePrice;
        }
      }
      
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          status: 'AWAITING_PAYMENT',
          payment_status: 'PENDING',
          amount: orderAmount, // Incluir amount na criação
          plan_id: selectedPlanId || 'single',
          is_instrumental: briefingData.isInstrumental,
          has_custom_lyric: briefingData.hasCustomLyric,
          is_confidential: briefingData.isConfidential,
          music_type: briefingData.musicType,
          music_style: briefingData.style,
          emotion: briefingData.emotion,
          emotion_intensity: briefingData.emotionIntensity,
          story: briefingData.story,
          has_monologue: briefingData.hasMonologue,
          monologue_position: briefingData.monologuePosition,
          mandatory_words: briefingData.mandatoryWords,
          restricted_words: briefingData.restrictedWords,
          voice_type: briefingData.voiceType,
          rhythm: briefingData.rhythm,
          atmosphere: briefingData.atmosphere,
          music_structure: JSON.stringify(briefingData.structure),
          instruments: briefingData.instruments.length > 0 ? briefingData.instruments : null,
          solo_instrument: briefingData.soloInstrument || null,
          solo_moment: briefingData.soloMoment || null,
          instrumentation_notes: briefingData.instrumentationNotes || null,
          song_title: briefingData.autoGenerateName ? null : (briefingData.songName || null),
          style_prompt: briefingData.hasCustomStylePrompt && briefingData.customStylePrompt ? briefingData.customStylePrompt : null,
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem('briefingData', JSON.stringify({ ...briefingData, orderId: orderData.id }));
      
      const orderType = briefingData.isInstrumental ? 'instrumental' : 'vocal';
      
      const { data: creditsData } = await supabase.functions.invoke('check-credits', {
        body: { orderType }
      });
      
      if (creditsData?.has_credits && creditsData?.total_available > 0) {
        const result = await supabase.functions.invoke('use-credit', {
          body: { orderId: orderData.id }
        });
        
        if (result.error || !result.data?.success) {
          console.error('Error using credit:', result.error || result.data?.error);
          navigate(`/checkout/${orderData.id}?planId=${selectedPlanId || 'single'}`);
          setIsCreatingOrder(false);
          return;
        }
        
        toast({
          title: '✨ Crédito utilizado!',
          description: 'Gerando sua música...',
        });
        
        await processOrderAfterCredit(orderData.id, briefingData);
        setIsCreatingOrder(false);
        return;
      }

      setPendingOrderId(orderData.id);
      setIsCreatingOrder(false);
      setShowNoCreditModal(true);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
      setIsCreatingOrder(false);
    }
  };

  // Handler para voltar do modo rápido
  const handleQuickCreationBack = () => {
    setCreationMode(null);
    setShowPlanSelection(true);
    setSelectedPlanId(null);
  };

  // Handler para aceitar sugestão de data comemorativa
  const handleCelebrationAccept = () => {
    if (!closestDate) return;
    
    // Guardar celebração selecionada e abrir modal de tipo
    setSelectedCelebration(closestDate);
    setShowCelebrationTypeModal(true);
  };

  // Handler para selecionar tipo de música da celebração
  const handleCelebrationTypeSelect = (type: 'vocal' | 'instrumental' | 'custom_lyric') => {
    if (!selectedCelebration) return;
    
    setCelebrationDismissed(true);
    setShowCelebrationTypeModal(false);
    setShowPlanSelection(false);
    
    // Pré-preencher formData com sugestões da celebração
    const newFormData: BriefingFormData = {
      ...formData,
      musicType: selectedCelebration.suggested_music_type || 'parodia',
      atmosphere: selectedCelebration.suggested_atmosphere || 'festivo',
      emotion: selectedCelebration.suggested_emotion || 'alegria',
      celebrationType: selectedCelebration.id,
      celebrationName: selectedCelebration.localizedName,
      celebrationEmoji: selectedCelebration.emoji,
      isInstrumental: type === 'instrumental',
      hasCustomLyric: type === 'custom_lyric',
    };
    
    setFormData(newFormData);
    
    // Definir plano baseado no tipo
    const planId = type === 'instrumental' ? 'single_instrumental' 
                 : type === 'custom_lyric' ? 'single_custom_lyric' 
                 : 'single';
    setSelectedPlanId(planId);
    
    // Atualizar URL com o planId
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('planId', planId);
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    
    // Adicionar mensagem de introdução personalizada
    const celebrationIntro: ChatMessage = {
      id: `msg-celebration-${Date.now()}`,
      type: 'bot',
      content: t('celebration.intro', { 
        name: selectedCelebration.localizedName,
        emoji: selectedCelebration.emoji,
        defaultValue: `${selectedCelebration.emoji} ${t('celebration.letsCreate', 'Vamos criar sua música de')} ${selectedCelebration.localizedName}!\n\n${t('celebration.preselected', 'Já selecionei as configurações ideais para essa data especial.')}`
      }),
    };
    
    setMessages([celebrationIntro]);
    
    // Determinar próximo step baseado no tipo
    if (type === 'custom_lyric') {
      // Letra própria: ir para colar letra (step 22)
      setCurrentStep(22);
      setTimeout(() => addBotMessage(chatFlow[22]), 1000);
    } else if (type === 'instrumental') {
      // Instrumental: pular musicType (já definido), ir para style (step 2)
      setCurrentStep(2);
      setTimeout(() => addBotMessage(chatFlow[2]), 1000);
    } else {
      // Vocal: pular musicType (já definido), ir para emotion (step 10)
      setCurrentStep(10);
      setTimeout(() => addBotMessage(chatFlow[10], 10), 1000);
    }
  };

  // Tela de seleção de pacote
  if (showPlanSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background flex flex-col">
        <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mr-1">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{t('planSelection.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('planSelection.subtitle')}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            {/* Celebration Suggestion Banner */}
            {closestDate && !celebrationDismissed && !isCelebrationLoading && (
              <CelebrationSuggestion
                celebration={closestDate}
                onAccept={handleCelebrationAccept}
                onDismiss={handleCelebrationDismiss}
              />
            )}
            
            {/* Credits Banner */}
            <CreditsBanner showBuyButton={false} />
            
            {/* Currency Warning */}
            <CurrencyWarning language={i18n.language} />

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">{t('planSelection.whatType')}</h2>
              <p className="text-muted-foreground">{t('planSelection.choosePackage')}</p>
            </div>

            {/* Single Music Options - Visual Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                {t('planSelection.singleMusic')}
              </h3>
              
              {/* Visual Cards Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Vocal Card */}
                <button
                  onClick={() => handlePlanSelection('single')}
                  className={`relative group rounded-xl overflow-hidden aspect-square transition-all duration-300 ${
                    hasVocalCredits 
                      ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' 
                      : 'hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background'
                  }`}
                >
                  <img 
                    src={creationModeImages.vocal} 
                    alt={t('planSelection.vocalSingle')}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                    <p className="text-white font-semibold text-xs sm:text-sm text-center">
                      {t('planSelection.vocalSingle')}
                    </p>
                    <p className="text-white/70 text-[10px] sm:text-xs text-center hidden sm:block">
                      {t('planSelection.vocalSingleDesc')}
                    </p>
                  </div>
                  {hasVocalCredits && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500/90 text-white text-[10px] px-1.5 py-0.5">
                        <Check className="w-3 h-3" />
                      </Badge>
                    </div>
                  )}
                </button>

                {/* Custom Lyric Card */}
                <button
                  onClick={() => handlePlanSelection('single_custom_lyric')}
                  className={`relative group rounded-xl overflow-hidden aspect-square transition-all duration-300 ${
                    hasVocalCredits 
                      ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' 
                      : 'hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background'
                  }`}
                >
                  <img 
                    src={creationModeImages.custom_lyric} 
                    alt={t('planSelection.customLyricSingle')}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                    <p className="text-white font-semibold text-xs sm:text-sm text-center">
                      {t('planSelection.customLyricSingle')}
                    </p>
                    <p className="text-white/70 text-[10px] sm:text-xs text-center hidden sm:block">
                      {t('planSelection.customLyricSingleDesc')}
                    </p>
                  </div>
                  {hasVocalCredits && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500/90 text-white text-[10px] px-1.5 py-0.5">
                        <Check className="w-3 h-3" />
                      </Badge>
                    </div>
                  )}
                </button>

                {/* Instrumental Card */}
                <button
                  onClick={() => handlePlanSelection('single_instrumental')}
                  className={`relative group rounded-xl overflow-hidden aspect-square transition-all duration-300 ${
                    hasInstrumentalCredits 
                      ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background' 
                      : 'hover:ring-2 hover:ring-accent hover:ring-offset-2 hover:ring-offset-background'
                  }`}
                >
                  <img 
                    src={creationModeImages.instrumental} 
                    alt={t('planSelection.instrumentalSingle')}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                    <p className="text-white font-semibold text-xs sm:text-sm text-center">
                      {t('planSelection.instrumentalSingle')}
                    </p>
                    <p className="text-white/70 text-[10px] sm:text-xs text-center hidden sm:block">
                      {t('planSelection.instrumentalSingleDesc')}
                    </p>
                  </div>
                  {hasInstrumentalCredits && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-purple-500/90 text-white text-[10px] px-1.5 py-0.5">
                        <Check className="w-3 h-3" />
                      </Badge>
                    </div>
                  )}
                </button>
              </div>
            </div>


            <p className="text-center text-sm text-muted-foreground pt-4">
              {t('planSelection.packagesNote')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Criação Rápida
  if (creationMode === 'quick') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background flex flex-col">
        <QuickCreation
          onSubmit={handleQuickCreationSubmit}
          onBack={handleQuickCreationBack}
          onSwitchToDetailed={handleSwitchToDetailed}
          styleOptions={styleOptions}
          voiceOptions={voiceTypeOptions}
          credits={totalVocal}
          isPreviewMode={previewCreditAvailable && totalVocal === 0}
        />
        {/* WhatsApp Modal for quick creation */}
        {user?.id && (
          <WhatsAppModal
            open={showWhatsAppModal}
            onOpenChange={setShowWhatsAppModal}
            onConfirm={handleWhatsAppConfirm}
            userId={user.id}
          />
        )}
        {/* No Credit Modal */}
        <Dialog open={showNoCreditModal} onOpenChange={setShowNoCreditModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">{t('noCreditModal.title')}</DialogTitle>
              <DialogDescription className="text-center">
                {t('noCreditModal.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('noCreditModal.message')}
              </p>
              <Button onClick={handleGoToCheckout} className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                {t('noCreditModal.buyButton')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Loading overlay */}
        {isCreatingOrder && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center px-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-foreground font-medium text-lg">{t('quickCreation.creating', 'Criando sua música...')}</p>
              <p className="text-sm text-muted-foreground">{t('quickCreation.deliveryTime', 'Sua música será entregue em até 12 horas ⏰')}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tela de confirmação
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background flex flex-col">
        <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{confirmationLabels.title}</h1>
              <p className="text-sm text-muted-foreground">
                {formData.hasCustomLyric ? t('confirmation.customLyricBadge') : formData.isInstrumental ? t('confirmation.instrumentalBadge') + " 🎹" : t('confirmation.vocalBadge') + " 🎤"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {/* Currency Warning */}
            <CurrencyWarning language={i18n.language} />
            
            <div className="bg-card rounded-2xl p-6 space-y-4 border border-border/50 shadow-lg">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {t('confirmation.summary')}
                {formData.hasCustomLyric ? (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">{t('confirmation.customLyricBadge')}</Badge>
                ) : formData.isInstrumental ? (
                  <Badge variant="secondary">{t('confirmation.instrumentalBadge')}</Badge>
                ) : null}
              </h2>
              
              <div className="space-y-3">
                <ConfirmationItem 
                  label={t('confirmation.format')} 
                  value={formData.isInstrumental ? "🎹 " + t('confirmation.instrumentalBadge') : "🎤 " + t('confirmation.vocalBadge')} 
                  onEdit={() => handleEditField(0)} 
                />
                <ConfirmationItem 
                  label={t('confirmation.type')} 
                  value={getFieldLabel('musicType', formData.musicType)} 
                  onEdit={() => handleEditField(1)} 
                />
                
                {formData.hasCustomLyric ? (
                  // Campos para letra customizada
                  <>
                    <ConfirmationItem 
                      label={t('confirmation.songName')} 
                      value={formData.songName || t('confirmation.none')} 
                      onEdit={() => handleEditField(30)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.customLyric')} 
                      value={formData.customLyricText.length > 100 ? formData.customLyricText.substring(0, 100) + "..." : formData.customLyricText} 
                      onEdit={() => handleEditField(22)} 
                    />
                    {formData.hasCustomStylePrompt ? (
                      // Mostrar style prompt customizado
                      <ConfirmationItem 
                        label={t('confirmation.stylePrompt')} 
                        value={formData.customStylePrompt.length > 100 ? formData.customStylePrompt.substring(0, 100) + "..." : formData.customStylePrompt} 
                        onEdit={() => handleEditField(24)} 
                      />
                    ) : (
                      // Mostrar opções de estilo geradas pela IA
                      <>
                        <ConfirmationItem 
                          label={t('confirmation.voiceType')} 
                          value={getFieldLabel('voiceType', formData.voiceType)} 
                          onEdit={() => handleEditField(26)} 
                        />
                        <ConfirmationItem 
                          label={t('confirmation.style')} 
                          value={getFieldLabel('style', formData.style)} 
                          onEdit={() => handleEditField(27)} 
                        />
                        <ConfirmationItem 
                          label={t('confirmation.rhythm')} 
                          value={getFieldLabel('rhythm', formData.rhythm)} 
                          onEdit={() => handleEditField(28)} 
                        />
                        <ConfirmationItem 
                          label={t('confirmation.atmosphere')} 
                          value={getFieldLabel('atmosphere', formData.atmosphere)} 
                          onEdit={() => handleEditField(29)} 
                        />
                      </>
                    )}
                  </>
                ) : formData.isInstrumental ? (
                  // Campos instrumentais
                  <>
                    <ConfirmationItem 
                      label={t('confirmation.style')} 
                      value={getFieldLabel('style', formData.style)} 
                      onEdit={() => handleEditField(2)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.instruments')} 
                      value={getFieldLabel('instruments', formData.instruments)} 
                      onEdit={() => handleEditField(3)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.solo')} 
                      value={getFieldLabel('soloInstrument', formData.soloInstrument)} 
                      onEdit={() => handleEditField(4)} 
                    />
                    {formData.soloInstrument && formData.soloInstrument !== 'none' && (
                      <ConfirmationItem 
                        label={t('confirmation.soloMoment')} 
                        value={getFieldLabel('soloMoment', formData.soloMoment)} 
                        onEdit={() => handleEditField(5)} 
                      />
                    )}
                    <ConfirmationItem 
                      label={t('confirmation.rhythm')} 
                      value={getFieldLabel('rhythm', formData.rhythm)} 
                      onEdit={() => handleEditField(6)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.atmosphere')} 
                      value={getFieldLabel('atmosphere', formData.atmosphere)} 
                      onEdit={() => handleEditField(7)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.context')} 
                      value={formData.story.length > 100 ? formData.story.substring(0, 100) + "..." : formData.story} 
                      onEdit={() => handleEditField(8)} 
                    />
                    {formData.instrumentationNotes && (
                      <ConfirmationItem 
                        label={t('confirmation.notes')} 
                        value={formData.instrumentationNotes.length > 100 ? formData.instrumentationNotes.substring(0, 100) + "..." : formData.instrumentationNotes} 
                        onEdit={() => handleEditField(9)} 
                      />
                    )}
                    <ConfirmationItem 
                      label={t('confirmation.songName')} 
                      value={formData.autoGenerateName ? t('confirmation.aiGenerated') : formData.songName} 
                      onEdit={() => handleEditField(20)} 
                    />
                  </>
                ) : (
                  // Campos cantada
                  <>
                    <ConfirmationItem 
                      label={t('confirmation.emotion')} 
                      value={getFieldLabel('emotion', formData.emotion)} 
                      onEdit={() => handleEditField(10)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.intensity')} 
                      value={getFieldLabel('emotionIntensity', formData.emotionIntensity)} 
                      onEdit={() => handleEditField(11)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.story')} 
                      value={formData.story.length > 100 ? formData.story.substring(0, 100) + "..." : formData.story} 
                      onEdit={() => handleEditField(12)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.mandatoryWords')} 
                      value={formData.mandatoryWords || t('confirmation.none')} 
                      onEdit={() => handleEditField(13)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.voiceType')} 
                      value={getFieldLabel('voiceType', formData.voiceType)} 
                      onEdit={() => handleEditField(14)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.style')} 
                      value={getFieldLabel('style', formData.style)} 
                      onEdit={() => handleEditField(15)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.rhythm')} 
                      value={getFieldLabel('rhythm', formData.rhythm)} 
                      onEdit={() => handleEditField(16)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.atmosphere')} 
                      value={getFieldLabel('atmosphere', formData.atmosphere)} 
                      onEdit={() => handleEditField(17)} 
                    />
                    <ConfirmationItem 
                      label={t('confirmation.songName')} 
                      value={formData.autoGenerateName ? t('confirmation.aiGenerated') : formData.songName} 
                      onEdit={() => handleEditField(18)} 
                    />
                  </>
                )}
              </div>
            </div>

            {/* Confidentiality Option - Only for custom lyrics */}
            {formData.hasCustomLyric && (
              <div className="bg-muted rounded-2xl p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={formData.isConfidential}
                  onChange={(e) => setFormData(prev => ({ ...prev, isConfidential: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="confidential" className="text-sm cursor-pointer">
                  <span className="font-semibold flex items-center gap-1">
                    🔒 Quero confidencialidade na minha letra
                  </span>
                  <p className="text-muted-foreground mt-1">
                    Sua letra não será compartilhada publicamente e será tratada com total privacidade.
                  </p>
                </label>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowConfirmation(false);
                  setCurrentStep(0);
                  setMessages([]);
                  setStepHistory([]);
                  setFormData(initialFormData);
                  clearSavedBriefing();
                  setTimeout(() => addBotMessage(chatFlow[0]), 500);
                }}
                className="flex-1"
                disabled={isCreatingOrder}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Recomeçar
              </Button>
              <Button onClick={checkWhatsAppAndFinish} className="flex-1" disabled={isCreatingOrder}>
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar e Criar
                  </>
                )}
              </Button>
            </div>

            {/* WhatsApp Modal */}
            {user?.id && (
              <WhatsAppModal
                open={showWhatsAppModal}
                onOpenChange={setShowWhatsAppModal}
                onConfirm={handleWhatsAppConfirm}
                userId={user.id}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={stepHistory.length > 0 ? handleGoBack : () => navigate('/')} 
            className="h-9 w-9 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Icon + Title */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm leading-tight truncate">
                {t('chat.createTitle', 'Crie sua música')}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {t('chat.subtitle', 'Converse comigo para criar sua música')}
              </p>
            </div>
          </div>
          
          {/* Plan/Celebration Badge */}
          {formData.celebrationName ? (
            <Badge variant="outline" className="text-xs px-2 py-1 border-primary/50 bg-primary/10 shrink-0">
              {formData.celebrationEmoji} {formData.celebrationName}
            </Badge>
          ) : currentPlanInfo && (
            <Badge variant="outline" className="text-xs px-2 py-1 border-primary/50 bg-primary/10 shrink-0">
              {currentPlanInfo.icon} {currentPlanInfo.name}
            </Badge>
          )}
        </div>
        
        {/* Credits row - inline with header */}
        {hasCredits && (
          <div className="max-w-3xl mx-auto px-4 pb-3">
            <CreditsBanner showBuyButton={false} compact />
          </div>
        )}
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-card border border-border/50 shadow-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {showInput && !isTyping && (
        <div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {/* Options with Image Cards for musicType, emotion, style */}
            {currentBotMessage.inputType === 'options' && currentBotMessage.options && (
              <>
                {/* Music Type - with image cards */}
                {currentBotMessage.field === 'musicType' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: typeImages[opt.id] || typeImages.homenagem
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('briefing:musicTypes', 'Tipos de música')}
                    onSelect={(id) => {
                      if (id.startsWith('custom:')) {
                        handleOptionSelect({ id, label: id.replace('custom:', '') });
                      } else {
                        const option = currentBotMessage.options?.find(o => o.id === id);
                        if (option) handleOptionSelect(option);
                      }
                    }}
                  />
                )}

                {/* Emotion - with circle image cards */}
                {currentBotMessage.field === 'emotion' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: emotionImages[opt.id] || emotionImages.alegria
                    }))}
                    selectedId={undefined}
                    variant="circle"
                    title={t('briefing:emotions', 'Emoções')}
                    onSelect={(id) => {
                      if (id.startsWith('custom:')) {
                        handleOptionSelect({ id, label: id.replace('custom:', '') });
                      } else {
                        const option = currentBotMessage.options?.find(o => o.id === id);
                        if (option) handleOptionSelect(option);
                      }
                    }}
                  />
                )}

                {/* Style/Genre - with image cards */}
                {currentBotMessage.field === 'style' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: genreImages[opt.id] || genreImages.pop
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('briefing:genres', 'Gêneros musicais')}
                    onSelect={(id) => {
                      if (id.startsWith('custom:')) {
                        // Para estilo customizado, usar o fluxo existente
                        setFormData(prev => ({ ...prev, style: 'outros', customStyle: id.replace('custom:', '') }));
                        addUserMessage(`✨ ${id.replace('custom:', '')}`);
                        setStepHistory(prev => [...prev, currentStep]);
                        const updatedFormData = { ...formData, style: 'outros', customStyle: id.replace('custom:', '') };
                        const nextStep = getNextStep(currentStep, updatedFormData);
                        setCurrentStep(nextStep);
                        if (nextStep < chatFlow.length) {
                          setTimeout(() => addBotMessage(chatFlow[nextStep], nextStep), 500);
                        } else {
                          showConfirmationScreen(updatedFormData);
                        }
                      } else {
                        const option = currentBotMessage.options?.find(o => o.id === id);
                        if (option) handleOptionSelect(option);
                      }
                    }}
                  />
                )}

                {/* Voice Type - with image cards */}
                {currentBotMessage.field === 'voiceType' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: voiceImages[opt.id] || voiceImages.masculina
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('briefing:voiceTypes', 'Tipos de voz')}
                    onSelect={(id) => {
                      if (id.startsWith('custom:')) {
                        handleOptionSelect({ id, label: id.replace('custom:', '') });
                      } else {
                        const option = currentBotMessage.options?.find(o => o.id === id);
                        if (option) handleOptionSelect(option);
                      }
                    }}
                  />
                )}

                {/* Corporate Format - with image cards */}
                {currentBotMessage.field === 'corporateFormat' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: corporateImages[opt.id] || corporateImages.institucional
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('briefing:corporateFormat', 'Formato corporativo')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Gospel Context - with image cards */}
                {currentBotMessage.field === 'gospelContext' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: gospelContextImages[opt.id] || gospelContextImages.adoracao
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('briefing:gospelContext', 'Contexto espiritual')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Children Age Group - with image cards */}
                {currentBotMessage.field === 'childAgeGroup' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: childAgeImages[opt.id] || childAgeImages['0-3']
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('steps.children.ageGroup.question', 'Faixa etária')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Children Objective - with image cards */}
                {currentBotMessage.field === 'childObjective' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: childObjectiveImages[opt.id] || childObjectiveImages.diversao
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('steps.children.objective.question', 'Objetivo')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Children Theme - with image cards */}
                {currentBotMessage.field === 'childTheme' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: childThemeImages[opt.id] || childThemeImages.animais
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('steps.children.theme.question', 'Tema')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Children Mood - with image cards */}
                {currentBotMessage.field === 'childMood' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: childMoodImages[opt.id] || childMoodImages.alegre
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('steps.children.mood.question', 'Clima')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Children Style - with image cards */}
                {currentBotMessage.field === 'childStyle' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: childStyleImages[opt.id] || childStyleImages.cantiga
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('steps.children.style.question', 'Estilo')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Soundtrack Usage - with image cards */}
                {currentBotMessage.field === 'soundtrackUsage' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: soundtrackUsageImages[opt.id] || soundtrackUsageImages.video_institucional
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('steps.soundtrack.usage.question', 'Tipo de uso')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Soundtrack Emotion - with image cards */}
                {currentBotMessage.field === 'soundtrackEmotion' && (
                  <ImageCardGrid
                    options={currentBotMessage.options.map(opt => ({
                      id: opt.id,
                      label: opt.label,
                      imageSrc: soundtrackEmotionImages[opt.id] || soundtrackEmotionImages.inspiracao
                    }))}
                    selectedId={undefined}
                    variant="square"
                    title={t('steps.soundtrack.emotion.question', 'Emoção da trilha')}
                    showOther={false}
                    onSelect={(id) => {
                      const option = currentBotMessage.options?.find(o => o.id === id);
                      if (option) handleOptionSelect(option);
                    }}
                  />
                )}

                {/* Default options (buttons) for other fields */}
                {currentBotMessage.field !== 'musicType' && 
                 currentBotMessage.field !== 'emotion' && 
                 currentBotMessage.field !== 'style' &&
                 currentBotMessage.field !== 'voiceType' &&
                 currentBotMessage.field !== 'corporateFormat' &&
                 currentBotMessage.field !== 'gospelContext' &&
                 currentBotMessage.field !== 'childAgeGroup' &&
                 currentBotMessage.field !== 'childObjective' &&
                 currentBotMessage.field !== 'childTheme' &&
                 currentBotMessage.field !== 'childMood' &&
                 currentBotMessage.field !== 'childStyle' &&
                 currentBotMessage.field !== 'soundtrackUsage' &&
                 currentBotMessage.field !== 'soundtrackEmotion' && (
                  <div className="flex flex-wrap gap-2">
                    {currentBotMessage.options.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        onClick={() => handleOptionSelect(option)}
                        className="h-auto py-2 px-4"
                      >
                        <span>{option.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Multi-select (instrumentos) */}
            {currentBotMessage.inputType === 'multi-select' && currentBotMessage.options && !showCustomInstrumentInput && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {/* Mostrar instrumentos pré-definidos */}
                  {currentBotMessage.options.map((option) => (
                    <Badge
                      key={option.id}
                      variant={selectedInstruments.includes(option.id) ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() => handleInstrumentToggle(option.id)}
                    >
                      {selectedInstruments.includes(option.id) && <Check className="w-3 h-3 mr-1" />}
                      {option.label}
                    </Badge>
                  ))}
                  
                  {/* Mostrar instrumentos personalizados já adicionados */}
                  {selectedInstruments
                    .filter(id => id.startsWith('custom:'))
                    .map(id => {
                      const name = id.replace('custom:', '');
                      return (
                        <Badge
                          key={id}
                          variant="default"
                          className="cursor-pointer py-2 px-3 text-sm bg-accent"
                          onClick={() => setSelectedInstruments(prev => prev.filter(i => i !== id))}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          ✏️ {name}
                        </Badge>
                      );
                    })
                  }
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleInstrumentsSubmit}
                    disabled={selectedInstruments.length === 0}
                    className="flex-1"
                  >
                    Confirmar {selectedInstruments.length > 0 && `(${selectedInstruments.length})`}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Input de instrumento personalizado */}
            {showCustomInstrumentInput && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Digite o nome do instrumento:</p>
                <div className="flex gap-2">
                  <Input
                    value={customInstrumentValue}
                    onChange={(e) => setCustomInstrumentValue(e.target.value)}
                    placeholder="Ex: Gaita, Berimbau, Kalimba..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomInstrument();
                      }
                    }}
                    autoFocus
                  />
                  <Button onClick={handleAddCustomInstrument}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setShowCustomInstrumentInput(false);
                    setCustomInstrumentValue("");
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar aos instrumentos
                </Button>
              </div>
            )}

            {/* Options with Other - with Image Cards for style */}
            {currentBotMessage.inputType === 'options-with-other' && currentBotMessage.options && !showCustomStyleInput && (
              <>
                {currentBotMessage.field === 'style' ? (
                  <div className="space-y-3">
                    <ImageCardGrid
                      options={currentBotMessage.options.filter(opt => opt.id !== 'outros').map(opt => ({
                        id: opt.id,
                        label: opt.label,
                        imageSrc: genreImages[opt.id] || genreImages.pop
                      }))}
                      selectedId={undefined}
                      variant="square"
                      title={t('briefing:genres', 'Gêneros musicais')}
                      onSelect={(id) => {
                        const option = currentBotMessage.options?.find(o => o.id === id);
                        if (option) handleOptionSelect(option);
                      }}
                    />
                    {/* Botão "Outro estilo" */}
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const outros = currentBotMessage.options?.find(o => o.id === 'outros');
                          if (outros) handleOptionSelect(outros);
                        }}
                        className="text-muted-foreground"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('briefing:otherStyle', 'Outro estilo...')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentBotMessage.options.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        onClick={() => handleOptionSelect(option)}
                        className="h-auto py-2 px-4"
                      >
                        <span>{option.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Custom style input */}
            {showCustomStyleInput && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Digite o estilo musical desejado:</p>
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ex: Lo-fi, Indie, Eletrônica..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomStyleSubmit();
                      }
                    }}
                  />
                  <Button onClick={handleCustomStyleSubmit}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCustomStyleInput(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar às opções
                </Button>
              </div>
            )}

            {/* Word suggestions */}
            {currentBotMessage.inputType === 'word-suggestions' && (
              <div className="space-y-3">
                {suggestedKeywords.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Sugestões da sua história:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedKeywords.map((word) => (
                        <Badge
                          key={word}
                          variant={selectedSuggestions.includes(word) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleSuggestionToggle(word)}
                        >
                          {selectedSuggestions.includes(word) && <Check className="w-3 h-3 mr-1" />}
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Adicione mais palavras (separadas por vírgula)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleWordSuggestionsSubmit();
                      }
                    }}
                  />
                  <Button onClick={handleWordSuggestionsSubmit}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setInputValue("");
                    setSelectedSuggestions([]);
                    handleWordSuggestionsSubmit();
                  }}
                >
                  Pular esta etapa <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Yes/No */}
            {currentBotMessage.inputType === 'yesno' && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleYesNo(true)}
                  className="flex-1"
                >
                  ✅ Sim, quero
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleYesNo(false)}
                  className="flex-1"
                >
                  ❌ Não precisa
                </Button>
              </div>
            )}

            {/* Intensity */}
            {currentBotMessage.inputType === 'intensity' && (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    variant={formData.emotionIntensity === num ? "default" : "outline"}
                    onClick={() => handleIntensitySelect(num)}
                    className="flex-1"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            )}

            {/* Text input */}
            {(currentBotMessage.inputType === 'text' || currentBotMessage.inputType === 'textarea') && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {currentBotMessage.inputType === 'textarea' ? (
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Digite ou use o microfone..."
                      rows={3}
                      className="flex-1 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextSubmit();
                        }
                      }}
                    />
                  ) : (
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        currentBotMessage.field === 'mandatoryWords' || currentBotMessage.field === 'restrictedWords'
                          ? "Digite ou pressione Enter para pular"
                          : "Digite aqui..."
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTextSubmit();
                        }
                      }}
                    />
                  )}
                  
                  {/* Botão de microfone para campos de texto longo */}
                  {isSupported && currentBotMessage.inputType === 'textarea' && (
                    <Button
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      onClick={isListening ? stopListening : startListening}
                      className="flex-shrink-0"
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  )}
                  
                  <Button onClick={handleTextSubmit}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                {isListening && (
                  <p className="text-sm text-primary animate-pulse">
                    🎤 Ouvindo... fale agora
                  </p>
                )}
              </div>
            )}

            {/* Skip button for optional fields */}
            {(currentBotMessage.field === 'restrictedWords' || currentBotMessage.field === 'instrumentationNotes') && (
              <Button
                variant="ghost"
                className="w-full mt-2 text-muted-foreground"
                onClick={() => {
                  setInputValue("");
                  handleTextSubmit();
                }}
              >
                Pular esta etapa <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Seleção de Tipo de Celebração */}
      <Dialog open={showCelebrationTypeModal} onOpenChange={setShowCelebrationTypeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedCelebration?.emoji} {t('celebration.selectType', 'Música de')} {selectedCelebration?.localizedName}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('celebration.selectTypeDesc', 'Escolha o tipo de música que você quer criar')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 justify-start"
              onClick={() => handleCelebrationTypeSelect('vocal')}
            >
              <span className="text-2xl mr-3">🎤</span>
              <div className="text-left">
                <p className="font-semibold">{t('celebration.vocalFor', 'Música Cantada')}</p>
                <p className="text-sm text-muted-foreground">{t('planSelection.vocalSingleDesc', 'Com letra e vocal personalizados')}</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 justify-start"
              onClick={() => handleCelebrationTypeSelect('instrumental')}
            >
              <span className="text-2xl mr-3">🎹</span>
              <div className="text-left">
                <p className="font-semibold">{t('celebration.instrumentalFor', 'Instrumental')}</p>
                <p className="text-sm text-muted-foreground">{t('planSelection.instrumentalSingleDesc', 'Trilha sem vocal')}</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 justify-start"
              onClick={() => handleCelebrationTypeSelect('custom_lyric')}
            >
              <span className="text-2xl mr-3">📝</span>
              <div className="text-left">
                <p className="font-semibold">{t('celebration.customLyricFor', 'Já Tenho a Letra')}</p>
                <p className="text-sm text-muted-foreground">{t('planSelection.customLyricSingleDesc', 'Traga sua própria composição')}</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Créditos Insuficientes */}
      <Dialog open={showNoCreditModal} onOpenChange={setShowNoCreditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              {t('noCreditModal.title', 'Créditos insuficientes')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('noCreditModal.description', 'Você não possui créditos disponíveis para criar esta música.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('noCreditModal.message', 'Adquira um pacote ou assinatura para continuar criando músicas.')}
            </p>
            
            <Button onClick={handleGoToCheckout} className="w-full">
              <CreditCard className="w-5 h-5 mr-2" />
              {t('noCreditModal.buyButton', 'Ver opções de compra')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente auxiliar para itens de confirmação
const ConfirmationItem = ({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <div className="flex-1">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <p className="font-medium">{value}</p>
    </div>
    <Button variant="ghost" size="sm" onClick={onEdit}>
      <Edit className="w-4 h-4" />
    </Button>
  </div>
);

export default Briefing;
