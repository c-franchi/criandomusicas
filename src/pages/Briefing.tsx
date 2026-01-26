import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Music, Send, Bot, User, ArrowRight, Loader2, ArrowLeft, Mic, MicOff, Check, Edit, Sparkles, CreditCard, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppModal from "@/components/WhatsAppModal";
import CreditsBanner from "@/components/CreditsBanner";
import { useCredits, getPlanLabel } from "@/hooks/useCredits";
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

// Opções de instrumentos disponíveis
const INSTRUMENT_OPTIONS = [
  { id: "piano", label: "🎹 Piano/Teclado" },
  { id: "violao", label: "🎸 Violão/Guitarra Acústica" },
  { id: "guitarra", label: "⚡ Guitarra Elétrica" },
  { id: "violino", label: "🎻 Violino/Cordas" },
  { id: "saxofone", label: "🎷 Saxofone" },
  { id: "trompete", label: "🎺 Trompete/Metais" },
  { id: "bateria", label: "🥁 Bateria/Percussão" },
  { id: "baixo", label: "🎵 Baixo" },
  { id: "ukulele", label: "🪕 Ukulele" },
  { id: "acordeao", label: "🪗 Acordeão/Sanfona" },
  { id: "orquestra", label: "🎼 Orquestra Completa" },
  { id: "sintetizador", label: "✨ Sintetizadores/Eletrônico" },
  { id: "flauta", label: "🎶 Flauta" },
  { id: "harpa", label: "🎵 Harpa" },
];

const Briefing = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, isSupported, transcript, startListening, stopListening, resetTranscript } = useSpeechToText();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [showCustomStyleInput, setShowCustomStyleInput] = useState(false);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [isUsingCredit, setIsUsingCredit] = useState(false);
  
  const initialFormData: BriefingFormData = {
    isInstrumental: false,
    hasCustomLyric: false,
    customLyricText: "",
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
    instrumentationNotes: ""
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

  // Iniciar chat (mostrar opção de continuar se há dados salvos, ou iniciar direto em instrumental)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Verificar se veio com parâmetro instrumental na URL
      const urlParams = new URLSearchParams(window.location.search);
      const startAsInstrumental = urlParams.get('instrumental') === 'true';
      
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
          content: `Bem-vindo de volta! 👋\n\nVocê tem um briefing em andamento. Deseja continuar de onde parou ou começar um novo?`,
          inputType: 'options',
          options: [
            { id: 'continue', label: '▶️ Continuar', description: 'Retomar de onde parei' },
            { id: 'restart', label: '🔄 Recomeçar', description: 'Iniciar um novo briefing' }
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
    // Fluxo "Já tenho a letra" (índices 22-28)
    if (data.hasCustomLyric) {
      if (!data.customLyricText) return 22;
      if (!data.musicType) return 23;
      if (!data.voiceType) return 24;
      if (!data.style) return 25;
      if (!data.rhythm) return 26;
      if (!data.atmosphere) return 27;
      if (!data.songName) return 28;  // Novo passo para nome da música
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
      content: "Olá! 👋 Eu sou a IA que vai criar sua música personalizada.\n\nPrimeiro, me conta: você quer uma música cantada ou apenas instrumental?",
      inputType: 'options',
      field: 'isInstrumental',
      options: [
        { id: "cantada", label: "🎤 Música Cantada", description: "Com letra e vocal" },
        { id: "custom_lyric", label: "📝 Já Tenho a Letra", description: "Usar minha própria letra" },
        { id: "instrumental", label: "🎹 Instrumental", description: "Apenas música, sem vocal" }
      ]
    },
    // Step 1: Tipo de música
    {
      type: 'bot',
      content: "Qual tipo de música você quer criar?",
      inputType: 'options',
      field: 'musicType',
      options: [
        { id: "homenagem", label: "🎁 Homenagem", description: "Para celebrar pessoas especiais" },
        { id: "romantica", label: "❤️ Romântica", description: "Declaração de amor" },
        { id: "motivacional", label: "💪 Motivacional", description: "Inspirar e motivar" },
        { id: "infantil", label: "🎈 Infantil", description: "Para crianças" },
        { id: "religiosa", label: "✝️ Religiosa", description: "Louvor e fé" },
        { id: "parodia", label: "🎭 Paródia/Humor", description: "Zueira e diversão" },
        { id: "corporativa", label: "🏢 Corporativa", description: "Para empresas" },
        { id: "trilha", label: "🎬 Trilha Sonora", description: "Para vídeos/projetos" }
      ]
    },
    // FLUXO INSTRUMENTAL (Steps 2-9)
    // Step 2: Estilo (instrumental)
    {
      type: 'bot',
      content: "Qual estilo musical você prefere para sua música instrumental?",
      inputType: 'options-with-other',
      field: 'style',
      options: [
        { id: "classico", label: "🎻 Clássico" },
        { id: "jazz", label: "🎷 Jazz" },
        { id: "pop", label: "🎵 Pop" },
        { id: "rock", label: "🎸 Rock" },
        { id: "mpb", label: "🇧🇷 MPB" },
        { id: "lofi", label: "🎧 Lo-fi" },
        { id: "eletronico", label: "🎹 Eletrônico" },
        { id: "bossa", label: "🌴 Bossa Nova" },
        { id: "ambiente", label: "🌙 Ambiente/Relaxante" },
        { id: "cinematico", label: "🎬 Cinematográfico" },
        { id: "outros", label: "✨ Outros" }
      ]
    },
    // Step 3: Instrumentos (multi-select)
    {
      type: 'bot',
      content: "Quais instrumentos você gostaria de ouvir na sua música? 🎵\n\nSelecione quantos quiser:",
      inputType: 'multi-select',
      field: 'instruments',
      options: INSTRUMENT_OPTIONS
    },
    // Step 4: Quer solo? (usa soloInstrument temporariamente como "want_solo")
    {
      type: 'bot',
      content: "Você gostaria que algum instrumento tivesse um solo especial na música? ✨",
      inputType: 'options',
      field: 'soloInstrument',
      options: [
        { id: "want_solo", label: "✨ Sim, quero um solo" },
        { id: "none", label: "❌ Não, sem solo" }
      ]
    },
    // Step 5: Qual instrumento terá o solo (dinâmico baseado nos instrumentos)
    {
      type: 'bot',
      content: "Qual instrumento terá o destaque com o solo? 🎵",
      inputType: 'options',
      field: 'soloInstrument',
      options: [] // Será preenchido dinamicamente com base nos instrumentos selecionados
    },
    // Step 6: Momento do solo
    {
      type: 'bot',
      content: "Em que momento da música você quer o solo?",
      inputType: 'options',
      field: 'soloMoment',
      options: [
        { id: "intro", label: "🎬 No início", description: "Para abrir com impacto" },
        { id: "meio", label: "🌉 No meio/ponte", description: "Para criar um momento especial" },
        { id: "final", label: "🎭 No final", description: "Para um gran finale" },
        { id: "auto", label: "🎲 Deixar a IA decidir", description: "O melhor momento" }
      ]
    },
    // Step 7: Ritmo (instrumental) - was step 6
    {
      type: 'bot',
      content: "Qual ritmo combina mais com sua música?",
      inputType: 'options',
      field: 'rhythm',
      options: [
        { id: "lento", label: "🐢 Lento", description: "Calmo, contemplativo" },
        { id: "moderado", label: "🚶 Moderado", description: "Versátil" },
        { id: "animado", label: "🏃 Animado", description: "Energético, dançante" }
      ]
    },
    // Step 8: Atmosfera (instrumental)
    {
      type: 'bot',
      content: "E qual atmosfera?",
      inputType: 'options',
      field: 'atmosphere',
      options: [
        { id: "intimo", label: "🕯️ Íntimo", description: "Aconchegante" },
        { id: "festivo", label: "🎉 Festivo", description: "Celebração" },
        { id: "melancolico", label: "🌧️ Melancólico", description: "Reflexivo" },
        { id: "epico", label: "🏔️ Épico", description: "Grandioso" },
        { id: "leve", label: "☁️ Leve", description: "Suave, tranquilo" },
        { id: "misterioso", label: "🌙 Misterioso", description: "Enigmático" }
      ]
    },
    // Step 9: História/Contexto (instrumental) - placeholder to keep index alignment
    {
      type: 'bot',
      content: "Conte um pouco sobre o contexto da sua música! 📝\n\nPara quem é? Qual ocasião? O que você quer transmitir?\n\n(Isso ajuda a IA a criar algo mais personalizado)",
      inputType: 'textarea',
      field: 'story'
    },
    // FLUXO CANTADA (Steps 10-19) - DEVE estar nos índices 10-19 do array!
    // Step 10: Emoção (índice 10)
    {
      type: 'bot',
      content: "Qual emoção principal deve transmitir?",
      inputType: 'options',
      field: 'emotion',
      options: [] // Será preenchido dinamicamente
    },
    // Step 11: Intensidade (índice 11)
    {
      type: 'bot',
      content: "Qual a intensidade dessa emoção?",
      inputType: 'intensity',
      field: 'emotionIntensity'
    },
    // Step 12: História (índice 12)
    {
      type: 'bot',
      content: "Agora me conte a história! 📝\n\nDescreva os fatos, momentos especiais, piadas internas, nomes importantes... Quanto mais detalhes, melhor será sua letra!",
      inputType: 'textarea',
      field: 'story'
    },
    // Step 13: Palavras obrigatórias (índice 13)
    {
      type: 'bot',
      content: "Tem alguma palavra, nome ou frase que DEVE aparecer na letra? (opcional)\n\nSelecione as sugestões ou digite novas:",
      inputType: 'word-suggestions',
      field: 'mandatoryWords'
    },
    // Step 14: Tipo de voz (índice 14)
    {
      type: 'bot',
      content: "Qual tipo de voz você prefere para sua música? 🎤",
      inputType: 'options',
      field: 'voiceType',
      options: [
        { id: "masculina", label: "👨 Voz Masculina", description: "Cantor solo masculino" },
        { id: "feminina", label: "👩 Voz Feminina", description: "Cantora solo feminina" },
        { id: "infantil_masc", label: "👦 Voz Infantil Masculina", description: "Criança menino" },
        { id: "infantil_fem", label: "👧 Voz Infantil Feminina", description: "Criança menina" },
        { id: "dueto", label: "👫 Dueto", description: "Homem e mulher cantando juntos" },
        { id: "dupla_masc", label: "👬 Dupla Masculina", description: "Dois cantores" },
        { id: "dupla_fem", label: "👭 Dupla Feminina", description: "Duas cantoras" },
        { id: "coral", label: "🎶 Coral/Grupo", description: "Múltiplas vozes" }
      ]
    },
    // Step 15: Estilo (cantada) (índice 15)
    {
      type: 'bot',
      content: "Qual estilo musical você prefere?",
      inputType: 'options-with-other',
      field: 'style',
      options: [
        { id: "sertanejo", label: "🤠 Sertanejo" },
        { id: "pop", label: "🎵 Pop" },
        { id: "rock", label: "🎸 Rock" },
        { id: "mpb", label: "🇧🇷 MPB" },
        { id: "rap", label: "🎤 Rap/Hip-Hop" },
        { id: "forro", label: "🎺 Forró" },
        { id: "pagode", label: "🪘 Pagode" },
        { id: "gospel", label: "🙏 Gospel/Worship" },
        { id: "bossa", label: "🎹 Bossa Nova" },
        { id: "outros", label: "✨ Outros" }
      ]
    },
    // Step 16: Ritmo (cantada) (índice 16)
    {
      type: 'bot',
      content: "Qual ritmo combina mais?",
      inputType: 'options',
      field: 'rhythm',
      options: [
        { id: "lento", label: "🐢 Lento", description: "Balada, emocional" },
        { id: "moderado", label: "🚶 Moderado", description: "Versátil" },
        { id: "animado", label: "🏃 Animado", description: "Rápido, dançante" }
      ]
    },
    // Step 17: Atmosfera (cantada) (índice 17)
    {
      type: 'bot',
      content: "E qual atmosfera?",
      inputType: 'options',
      field: 'atmosphere',
      options: [
        { id: "intimo", label: "🕯️ Íntimo", description: "Aconchegante" },
        { id: "festivo", label: "🎉 Festivo", description: "Celebração" },
        { id: "melancolico", label: "🌧️ Melancólico", description: "Reflexivo" },
        { id: "epico", label: "🏔️ Épico", description: "Grandioso" },
        { id: "leve", label: "☁️ Leve", description: "Suave, tranquilo" }
      ]
    },
    // Step 18: Nome automático? (cantada) (índice 18)
    {
      type: 'bot',
      content: "Quase lá! 🎵\n\nVocê quer dar um nome para sua música ou deixar a IA sugerir um título criativo?",
      inputType: 'options',
      field: 'autoGenerateName',
      options: [
        { id: "auto", label: "🤖 Deixar a IA criar", description: "Título automático" },
        { id: "manual", label: "✍️ Eu quero escolher", description: "Digitar nome" }
      ]
    },
    // Step 19: Nome da música (cantada) (índice 19)
    {
      type: 'bot',
      content: "Qual nome você quer dar para sua música?",
      inputType: 'text',
      field: 'songName'
    },
    // FLUXO INSTRUMENTAL - NOME (Steps 20-21) - índices 20-21 do array
    // Step 20: Nome automático? (Instrumental) (índice 20)
    {
      type: 'bot',
      content: "Quase lá! 🎵\n\nVocê quer dar um nome para sua música instrumental ou deixar a IA sugerir?",
      inputType: 'options',
      field: 'autoGenerateName',
      options: [
        { id: "auto", label: "🤖 Deixar a IA criar", description: "Título automático" },
        { id: "manual", label: "✍️ Eu quero escolher", description: "Digitar nome" }
      ]
    },
    // Step 21: Nome da música (Instrumental) (índice 21)
    {
      type: 'bot',
      content: "Qual nome você quer dar para sua música instrumental?",
      inputType: 'text',
      field: 'songName'
    },
    // FLUXO "JÁ TENHO A LETRA" (índices 22-28 do array)
    // Índice 22: Cole sua letra
    {
      type: 'bot',
      content: "Ótimo! 📝 Cole sua letra completa abaixo.\n\nDica: inclua a estrutura (verso, refrão, etc.) se quiser que a IA respeite esse formato.",
      inputType: 'textarea',
      field: 'customLyricText'
    },
    // Índice 23: Tipo de música (custom lyric)
    {
      type: 'bot',
      content: "Qual tipo de música você imagina para essa letra?",
      inputType: 'options',
      field: 'musicType',
      options: [
        { id: "homenagem", label: "🎁 Homenagem", description: "Para celebrar pessoas especiais" },
        { id: "romantica", label: "❤️ Romântica", description: "Declaração de amor" },
        { id: "motivacional", label: "💪 Motivacional", description: "Inspirar e motivar" },
        { id: "religiosa", label: "✝️ Religiosa", description: "Louvor e fé" },
        { id: "corporativa", label: "🏢 Corporativa", description: "Para empresas" }
      ]
    },
    // Índice 24: Tipo de voz (custom lyric)
    {
      type: 'bot',
      content: "Qual tipo de voz você prefere para sua música? 🎤",
      inputType: 'options',
      field: 'voiceType',
      options: [
        { id: "masculina", label: "👨 Voz Masculina" },
        { id: "feminina", label: "👩 Voz Feminina" },
        { id: "dueto", label: "👫 Dueto" },
        { id: "coral", label: "🎶 Coral/Grupo" }
      ]
    },
    // Índice 25: Estilo (custom lyric)
    {
      type: 'bot',
      content: "Qual estilo musical combina com sua letra?",
      inputType: 'options-with-other',
      field: 'style',
      options: [
        { id: "sertanejo", label: "🤠 Sertanejo" },
        { id: "pop", label: "🎵 Pop" },
        { id: "rock", label: "🎸 Rock" },
        { id: "mpb", label: "🇧🇷 MPB" },
        { id: "gospel", label: "🙏 Gospel" },
        { id: "bossa", label: "🎹 Bossa Nova" },
        { id: "outros", label: "✨ Outros" }
      ]
    },
    // Índice 26: Ritmo (custom lyric)
    {
      type: 'bot',
      content: "Qual ritmo combina mais com sua música?",
      inputType: 'options',
      field: 'rhythm',
      options: [
        { id: "lento", label: "🐢 Lento", description: "Balada, emocional" },
        { id: "moderado", label: "🚶 Moderado", description: "Versátil" },
        { id: "animado", label: "🏃 Animado", description: "Rápido, dançante" }
      ]
    },
    // Índice 27: Atmosfera (custom lyric)
    {
      type: 'bot',
      content: "E qual atmosfera?",
      inputType: 'options',
      field: 'atmosphere',
      options: [
        { id: "intimo", label: "🕯️ Íntimo" },
        { id: "festivo", label: "🎉 Festivo" },
        { id: "melancolico", label: "🌧️ Melancólico" },
        { id: "epico", label: "🏔️ Épico" },
        { id: "leve", label: "☁️ Leve" }
      ]
    },
    // Índice 28: Nome da música (custom lyric) - NOVO PASSO
    {
      type: 'bot',
      content: "Qual nome você quer dar para sua música? ✨",
      inputType: 'text',
      field: 'songName'
    }
  ];

  const getEmotionOptions = (musicType: string) => {
    if (musicType === 'parodia') {
      return [
        { id: "zoeira", label: "😂 Zoeira Leve" },
        { id: "sarcastico", label: "😏 Sarcástico" },
        { id: "ironico", label: "🙃 Irônico" },
        { id: "critica", label: "🎭 Crítica Humorada" },
        { id: "absurdo", label: "🤪 Absurdo Total" }
      ];
    }
    return [
      { id: "alegria", label: "😊 Alegria" },
      { id: "saudade", label: "💭 Saudade" },
      { id: "gratidao", label: "🙏 Gratidão" },
      { id: "amor", label: "❤️ Amor" },
      { id: "esperanca", label: "🌈 Esperança" },
      { id: "nostalgia", label: "📷 Nostalgia" },
      { id: "superacao", label: "💪 Superação" }
    ];
  };

  // Gerar opções de solo baseado nos instrumentos selecionados
  const getSoloOptions = (instruments: string[]) => {
    // Se não tem instrumentos, só mostrar opção de não
    if (instruments.length === 0) {
      return [{ id: "none", label: "❌ Não, sem solo", description: "Prefiro sem solo" }];
    }
    
    const options = [
      { id: "yes", label: "✅ Sim, quero solo!", description: "Escolher instrumento" },
      { id: "none", label: "❌ Não, sem solo", description: "Prefiro sem solo" }
    ];
    
    // Adicionar cada instrumento como opção de solo
    instruments.forEach(instId => {
      const inst = INSTRUMENT_OPTIONS.find(i => i.id === instId);
      if (inst) {
        options.push({ id: instId, label: inst.label, description: "Solo especial" });
      }
    });
    
    return options;
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

  const addBotMessage = (msg: Omit<ChatMessage, 'id'>) => {
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
          ? "Qual tipo de humor você quer?" 
          : "Qual emoção principal deve transmitir?";
      }
      
      // Se for step 5 (qual instrumento terá solo), preencher com instrumentos selecionados
      if (msg.field === 'soloInstrument' && currentStep === 5) {
        const instrumentOptions = formData.instruments.map(instId => {
          const inst = INSTRUMENT_OPTIONS.find(i => i.id === instId);
          return { id: instId, label: inst?.label || instId };
        });
        newMsg.options = instrumentOptions.length > 0 
          ? instrumentOptions 
          : [{ id: "piano", label: "🎹 Piano/Teclado" }];
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
      return data.isInstrumental ? 2 : 10; // Instrumental vai para 2, Cantada vai para 10
    }
    
    // FLUXO "JÁ TENHO A LETRA" (índices 22-28 do chatFlow)
    if (data.hasCustomLyric) {
      if (current === 22) return 23; // customLyricText -> musicType
      if (current === 23) return 24; // musicType -> voiceType
      if (current === 24) return 25; // voiceType -> style
      if (current === 25) return 26; // style -> rhythm
      if (current === 26) return 27; // rhythm -> atmosphere
      if (current === 27) return 28; // atmosphere -> songName (NOVO!)
      if (current === 28) return 100; // songName -> confirmação
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

    const nextStep = getNextStep(currentStep, { ...formData, style: 'outros', customStyle });
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      showConfirmationScreen({ ...formData, style: 'outros', customStyle });
    }
  };

  const handleYesNo = (yes: boolean) => {
    const currentMsg = messages[messages.length - 1];
    if (!currentMsg?.field) return;

    setFormData(prev => ({ ...prev, [currentMsg.field!]: yes }));
    addUserMessage(yes ? "✅ Sim" : "❌ Não");
    setStepHistory(prev => [...prev, currentStep]);

    const nextStep = getNextStep(currentStep, { ...formData, [currentMsg.field]: yes });
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      showConfirmationScreen({ ...formData, [currentMsg.field]: yes } as BriefingFormData);
    }
  };

  const handleIntensitySelect = (value: number) => {
    setFormData(prev => ({ ...prev, emotionIntensity: value }));
    const labels = ['Muito sutil', 'Sutil', 'Moderada', 'Intensa', 'Muito intensa'];
    addUserMessage(`${value}/5 - ${labels[value - 1]}`);
    setStepHistory(prev => [...prev, currentStep]);

    const nextStep = getNextStep(currentStep, { ...formData, emotionIntensity: value });
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
    setSelectedInstruments(prev => 
      prev.includes(instId) 
        ? prev.filter(i => i !== instId)
        : [...prev, instId]
    );
  };

  const handleInstrumentsSubmit = () => {
    if (selectedInstruments.length === 0) {
      toast({
        title: 'Selecione ao menos um instrumento',
        variant: 'destructive'
      });
      return;
    }

    const labels = selectedInstruments
      .map(id => INSTRUMENT_OPTIONS.find(i => i.id === id)?.label || id)
      .join(', ');
    
    setFormData(prev => ({ ...prev, instruments: selectedInstruments }));
    addUserMessage(labels);
    setStepHistory(prev => [...prev, currentStep]);
    
    const updatedFormData = { ...formData, instruments: selectedInstruments };
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

    const nextStep = getNextStep(currentStep, { ...formData, mandatoryWords: finalValue });
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

    const nextStep = getNextStep(currentStep, { ...formData, [field]: value });
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      showConfirmationScreen({ ...formData, [field]: value } as BriefingFormData);
    }
  };

  const showConfirmationScreen = (data: BriefingFormData) => {
    setFormData(data);
    setIsTyping(true);
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
    
    // Reiniciar desde o início até o step desejado
    setTimeout(() => {
      addBotMessage(chatFlow[step]);
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
      finishBriefing();
    }
  };

  const finishBriefing = async () => {
    const data = formData;
    
    // Limpar auto-save ao finalizar
    clearSavedBriefing();
    
    // Criar ordem no banco primeiro
    const briefingData = {
      isInstrumental: data.isInstrumental,
      hasCustomLyric: data.hasCustomLyric,
      customLyricText: data.customLyricText,
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
      // Campos instrumentais
      instruments: data.instruments,
      soloInstrument: data.soloInstrument,
      soloMoment: data.soloMoment,
      instrumentationNotes: data.instrumentationNotes,
      plan: userPlan,
      lgpdConsent: true
    };

    // Criar ordem no Supabase
    try {
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          status: 'AWAITING_PAYMENT',
          payment_status: 'PENDING',
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
        })
        .select()
        .single();

      if (error) throw error;

      // Salvar dados completos no localStorage para uso posterior
      localStorage.setItem('briefingData', JSON.stringify({ ...briefingData, orderId: orderData.id }));
      
      // Verificar se usuário tem créditos disponíveis
      const { data: creditsData } = await supabase.functions.invoke('check-credits');
      
      if (creditsData?.has_credits && creditsData?.total_available > 0) {
        // Mostrar modal de confirmação ao invés de usar automaticamente
        setPendingOrderId(orderData.id);
        setAvailableCredits(creditsData.total_available);
        setShowCreditModal(true);
        return;
      }

      // Sem créditos, ir para checkout
      const urlParams = new URLSearchParams(window.location.search);
      const planId = urlParams.get('planId') || 'single';
      
      // Redirecionar para checkout com planId
      navigate(`/checkout/${orderData.id}?planId=${planId}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  // Handler para usar crédito do modal
  const handleUseCredit = async () => {
    if (!pendingOrderId) return;
    
    setIsUsingCredit(true);
    try {
      const { data: useCreditResult, error: useCreditError } = await supabase.functions.invoke('use-credit', {
        body: { orderId: pendingOrderId }
      });

      if (useCreditError || !useCreditResult?.success) {
        console.error('Error using credit:', useCreditError || useCreditResult?.error);
        toast({
          title: 'Erro ao usar crédito',
          description: 'Ocorreu um erro. Você será redirecionado para o checkout.',
          variant: 'destructive'
        });
        // Se falhar, ir para checkout
        const urlParams = new URLSearchParams(window.location.search);
        const planId = urlParams.get('planId') || 'single';
        navigate(`/checkout/${pendingOrderId}?planId=${planId}`);
        return;
      }

      // Crédito usado com sucesso!
      toast({
        title: '✨ Crédito utilizado!',
        description: `Você usou 1 crédito. Restam ${useCreditResult.remaining_credits} músicas no seu pacote.`,
      });

      // Limpar briefing salvo
      clearSavedBriefing();
      
      // Redirecionar direto para criação da música
      navigate(`/criar-musica?orderId=${pendingOrderId}`);
    } catch (error) {
      console.error('Error using credit:', error);
      toast({
        title: 'Erro ao usar crédito',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsUsingCredit(false);
      setShowCreditModal(false);
    }
  };

  // Handler para ir ao checkout ao invés de usar crédito
  const handleGoToCheckout = () => {
    if (!pendingOrderId) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('planId') || 'single';
    setShowCreditModal(false);
    navigate(`/checkout/${pendingOrderId}?planId=${planId}`);
  };

  const getFieldLabel = (field: string, value: string | boolean | number | string[]): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return "(nenhum)";
      return value.map(v => {
        const inst = INSTRUMENT_OPTIONS.find(i => i.id === v);
        return inst?.label || v;
      }).join(', ');
    }

    const labelMaps: Record<string, Record<string, string>> = {
      musicType: {
        homenagem: "🎁 Homenagem",
        romantica: "❤️ Romântica",
        motivacional: "💪 Motivacional",
        infantil: "🎈 Infantil",
        religiosa: "✝️ Religiosa",
        parodia: "🎭 Paródia/Humor",
        corporativa: "🏢 Corporativa",
        trilha: "🎬 Trilha Sonora"
      },
      emotion: {
        alegria: "😊 Alegria",
        saudade: "💭 Saudade",
        gratidao: "🙏 Gratidão",
        amor: "❤️ Amor",
        esperanca: "🌈 Esperança",
        nostalgia: "📷 Nostalgia",
        superacao: "💪 Superação",
        zoeira: "😂 Zoeira Leve",
        sarcastico: "😏 Sarcástico",
        ironico: "🙃 Irônico",
        critica: "🎭 Crítica Humorada",
        absurdo: "🤪 Absurdo Total"
      },
      style: {
        sertanejo: "🤠 Sertanejo",
        pop: "🎵 Pop",
        rock: "🎸 Rock",
        mpb: "🇧🇷 MPB",
        rap: "🎤 Rap/Hip-Hop",
        forro: "🎺 Forró",
        pagode: "🪘 Pagode",
        gospel: "🙏 Gospel/Worship",
        bossa: "🎹 Bossa Nova",
        classico: "🎻 Clássico",
        jazz: "🎷 Jazz",
        lofi: "🎧 Lo-fi",
        eletronico: "🎹 Eletrônico",
        ambiente: "🌙 Ambiente/Relaxante",
        cinematico: "🎬 Cinematográfico",
        outros: `✨ ${formData.customStyle}`
      },
      voiceType: {
        masculina: "👨 Voz Masculina",
        feminina: "👩 Voz Feminina",
        infantil_masc: "👦 Voz Infantil Masculina",
        infantil_fem: "👧 Voz Infantil Feminina",
        dueto: "👫 Dueto",
        dupla_masc: "👬 Dupla Masculina",
        dupla_fem: "👭 Dupla Feminina",
        coral: "🎶 Coral/Grupo"
      },
      rhythm: {
        lento: "🐢 Lento",
        moderado: "🚶 Moderado",
        animado: "🏃 Animado"
      },
      atmosphere: {
        intimo: "🕯️ Íntimo",
        festivo: "🎉 Festivo",
        melancolico: "🌧️ Melancólico",
        epico: "🏔️ Épico",
        leve: "☁️ Leve",
        misterioso: "🌙 Misterioso"
      },
      soloMoment: {
        intro: "🎬 No início",
        meio: "🌉 No meio/ponte",
        final: "🎭 No final",
        auto: "🎲 IA decide"
      }
    };

    if (typeof value === 'boolean') {
      return value ? "Sim" : "Não";
    }
    if (typeof value === 'number') {
      const labels = ['Muito sutil', 'Sutil', 'Moderada', 'Intensa', 'Muito intensa'];
      return `${value}/5 - ${labels[value - 1]}`;
    }
    
    // Solo instrument
    if (field === 'soloInstrument') {
      if (value === 'none' || !value) return "Sem solo";
      const inst = INSTRUMENT_OPTIONS.find(i => i.id === value);
      return inst?.label || value;
    }
    
    return labelMaps[field]?.[value] || value || "(nenhum)";
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

  // Tela de confirmação
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Confirme seu Briefing</h1>
              <p className="text-sm text-muted-foreground">
                {formData.hasCustomLyric ? "📝 Letra Própria" : formData.isInstrumental ? "Música Instrumental 🎹" : "Música Cantada 🎤"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            <div className="bg-muted rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                🎵 Resumo da sua música
                {formData.hasCustomLyric ? (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">📝 Letra Própria</Badge>
                ) : formData.isInstrumental ? (
                  <Badge variant="secondary">Instrumental</Badge>
                ) : null}
              </h2>
              
              <div className="space-y-3">
                <ConfirmationItem 
                  label="Formato" 
                  value={formData.isInstrumental ? "🎹 Instrumental" : "🎤 Música Cantada"} 
                  onEdit={() => handleEditField(0)} 
                />
                <ConfirmationItem 
                  label="Tipo" 
                  value={getFieldLabel('musicType', formData.musicType)} 
                  onEdit={() => handleEditField(1)} 
                />
                
                {formData.hasCustomLyric ? (
                  // Campos para letra customizada
                  <>
                    <ConfirmationItem 
                      label="Nome da música" 
                      value={formData.songName || "(não definido)"} 
                      onEdit={() => handleEditField(28)} 
                    />
                    <ConfirmationItem 
                      label="Letra" 
                      value={formData.customLyricText.length > 100 ? formData.customLyricText.substring(0, 100) + "..." : formData.customLyricText} 
                      onEdit={() => handleEditField(22)} 
                    />
                    <ConfirmationItem 
                      label="Tipo de voz" 
                      value={getFieldLabel('voiceType', formData.voiceType)} 
                      onEdit={() => handleEditField(24)} 
                    />
                    <ConfirmationItem 
                      label="Estilo" 
                      value={getFieldLabel('style', formData.style)} 
                      onEdit={() => handleEditField(25)} 
                    />
                    <ConfirmationItem 
                      label="Ritmo" 
                      value={getFieldLabel('rhythm', formData.rhythm)} 
                      onEdit={() => handleEditField(26)} 
                    />
                    <ConfirmationItem 
                      label="Atmosfera" 
                      value={getFieldLabel('atmosphere', formData.atmosphere)} 
                      onEdit={() => handleEditField(27)} 
                    />
                  </>
                ) : formData.isInstrumental ? (
                  // Campos instrumentais
                  <>
                    <ConfirmationItem 
                      label="Estilo" 
                      value={getFieldLabel('style', formData.style)} 
                      onEdit={() => handleEditField(2)} 
                    />
                    <ConfirmationItem 
                      label="Instrumentos" 
                      value={getFieldLabel('instruments', formData.instruments)} 
                      onEdit={() => handleEditField(3)} 
                    />
                    <ConfirmationItem 
                      label="Solo" 
                      value={getFieldLabel('soloInstrument', formData.soloInstrument)} 
                      onEdit={() => handleEditField(4)} 
                    />
                    {formData.soloInstrument && formData.soloInstrument !== 'none' && (
                      <ConfirmationItem 
                        label="Momento do solo" 
                        value={getFieldLabel('soloMoment', formData.soloMoment)} 
                        onEdit={() => handleEditField(5)} 
                      />
                    )}
                    <ConfirmationItem 
                      label="Ritmo" 
                      value={getFieldLabel('rhythm', formData.rhythm)} 
                      onEdit={() => handleEditField(6)} 
                    />
                    <ConfirmationItem 
                      label="Atmosfera" 
                      value={getFieldLabel('atmosphere', formData.atmosphere)} 
                      onEdit={() => handleEditField(7)} 
                    />
                    <ConfirmationItem 
                      label="Contexto" 
                      value={formData.story.length > 100 ? formData.story.substring(0, 100) + "..." : formData.story} 
                      onEdit={() => handleEditField(8)} 
                    />
                    {formData.instrumentationNotes && (
                      <ConfirmationItem 
                        label="Observações" 
                        value={formData.instrumentationNotes.length > 100 ? formData.instrumentationNotes.substring(0, 100) + "..." : formData.instrumentationNotes} 
                        onEdit={() => handleEditField(9)} 
                      />
                    )}
                    <ConfirmationItem 
                      label="Nome da música" 
                      value={formData.autoGenerateName ? "Gerado pela IA" : formData.songName} 
                      onEdit={() => handleEditField(20)} 
                    />
                  </>
                ) : (
                  // Campos cantada
                  <>
                    <ConfirmationItem 
                      label="Emoção" 
                      value={getFieldLabel('emotion', formData.emotion)} 
                      onEdit={() => handleEditField(10)} 
                    />
                    <ConfirmationItem 
                      label="Intensidade" 
                      value={getFieldLabel('emotionIntensity', formData.emotionIntensity)} 
                      onEdit={() => handleEditField(11)} 
                    />
                    <ConfirmationItem 
                      label="História" 
                      value={formData.story.length > 100 ? formData.story.substring(0, 100) + "..." : formData.story} 
                      onEdit={() => handleEditField(12)} 
                    />
                    <ConfirmationItem 
                      label="Palavras obrigatórias" 
                      value={formData.mandatoryWords || "(nenhuma)"} 
                      onEdit={() => handleEditField(13)} 
                    />
                    <ConfirmationItem 
                      label="Tipo de voz" 
                      value={getFieldLabel('voiceType', formData.voiceType)} 
                      onEdit={() => handleEditField(14)} 
                    />
                    <ConfirmationItem 
                      label="Estilo" 
                      value={getFieldLabel('style', formData.style)} 
                      onEdit={() => handleEditField(15)} 
                    />
                    <ConfirmationItem 
                      label="Ritmo" 
                      value={getFieldLabel('rhythm', formData.rhythm)} 
                      onEdit={() => handleEditField(16)} 
                    />
                    <ConfirmationItem 
                      label="Atmosfera" 
                      value={getFieldLabel('atmosphere', formData.atmosphere)} 
                      onEdit={() => handleEditField(17)} 
                    />
                    <ConfirmationItem 
                      label="Nome da música" 
                      value={formData.autoGenerateName ? "Gerado pela IA" : formData.songName} 
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
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Recomeçar
              </Button>
              <Button onClick={checkWhatsAppAndFinish} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Confirmar e Criar
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {stepHistory.length > 0 ? (
            <Button variant="ghost" size="icon" onClick={handleGoBack} className="mr-1">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mr-1" title="Voltar à homepage">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">Briefing Musical</h1>
            <p className="text-sm text-muted-foreground">Converse comigo para criar sua música</p>
          </div>
        </div>
      </header>

      {/* Credits Banner */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <CreditsBanner showBuyButton={false} />
      </div>

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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
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
            {/* Options */}
            {currentBotMessage.inputType === 'options' && currentBotMessage.options && (
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

            {/* Multi-select (instrumentos) */}
            {currentBotMessage.inputType === 'multi-select' && currentBotMessage.options && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
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

            {/* Options with Other */}
            {currentBotMessage.inputType === 'options-with-other' && currentBotMessage.options && !showCustomStyleInput && (
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

      {/* Modal de Confirmação de Créditos */}
      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-primary" />
              Você tem créditos disponíveis!
            </DialogTitle>
            <DialogDescription className="pt-2">
              Você possui <span className="font-bold text-primary">{availableCredits} música{availableCredits !== 1 ? 's' : ''}</span> disponível{availableCredits !== 1 ? 'is' : ''} no seu pacote.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Deseja usar um crédito para criar esta música ou prefere comprar um novo pacote?
            </p>
            
            <div className="grid gap-3">
              <Button 
                onClick={handleUseCredit} 
                disabled={isUsingCredit}
                className="w-full h-auto py-4 flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-2 w-full">
                  {isUsingCredit ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                  <span className="font-semibold">Usar 1 crédito</span>
                </div>
                <span className="text-xs opacity-80 ml-7">
                  Restará {availableCredits - 1} música{availableCredits - 1 !== 1 ? 's' : ''} no pacote
                </span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleGoToCheckout}
                disabled={isUsingCredit}
                className="w-full h-auto py-4 flex flex-col items-start gap-1"
              >
                <div className="flex items-center gap-2 w-full">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-semibold">Ir para checkout</span>
                </div>
                <span className="text-xs opacity-80 ml-7">
                  Comprar novo pacote ou música avulsa
                </span>
              </Button>
            </div>
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
