import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Music, Send, Bot, User, ArrowRight, Loader2, ArrowLeft, Mic, MicOff, Check, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppModal from "@/components/WhatsAppModal";

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  options?: { id: string; label: string; description?: string }[];
  field?: keyof BriefingFormData;
  inputType?: 'text' | 'textarea' | 'options' | 'intensity' | 'yesno' | 'options-with-other' | 'word-suggestions';
}

interface BriefingFormData {
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
  const [showCustomStyleInput, setShowCustomStyleInput] = useState(false);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(false);
  
  const initialFormData: BriefingFormData = {
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
    voiceType: ""
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
    const hasAnyData = Object.values(formData).some(v => 
      typeof v === 'string' ? v.length > 0 : typeof v === 'boolean' ? v : v !== 3
    );
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

  // Iniciar chat (mostrar opção de continuar se há dados salvos)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasSavedData && formData.musicType) {
        // Tem dados salvos, mostrar opção de continuar
        const savedStep = getSavedStep(formData);
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
    if (!data.musicType) return 0;
    if (!data.emotion) return 1;
    if (!data.story) return 3;
    if (data.hasMonologue && !data.monologuePosition) return 5;
    if (!data.voiceType) return 6; // Novo step de voiceType
    if (!data.style) return 8;
    if (!data.rhythm) return 9;
    if (!data.atmosphere) return 10;
    if (!data.autoGenerateName && !data.songName) return 12;
    return 13; // Vai para confirmação
  };

  const chatFlow: Omit<ChatMessage, 'id'>[] = [
    {
      type: 'bot',
      content: "Olá! 👋 Eu sou a IA que vai criar sua música personalizada. Vamos começar!\n\nQual tipo de música você quer criar?",
      inputType: 'options',
      field: 'musicType',
      options: [
        { id: "homenagem", label: "🎁 Homenagem", description: "Para celebrar pessoas especiais" },
        { id: "romantica", label: "❤️ Romântica", description: "Declaração de amor" },
        { id: "motivacional", label: "💪 Motivacional", description: "Inspirar e motivar" },
        { id: "infantil", label: "🎈 Infantil", description: "Para crianças" },
        { id: "religiosa", label: "✝️ Religiosa", description: "Louvor e fé" },
        { id: "parodia", label: "🎭 Paródia/Humor", description: "Zueira e diversão" }
      ]
    },
    {
      type: 'bot',
      content: "Qual emoção principal deve transmitir?",
      inputType: 'options',
      field: 'emotion',
      options: [] // Será preenchido dinamicamente
    },
    {
      type: 'bot',
      content: "Qual a intensidade dessa emoção?",
      inputType: 'intensity',
      field: 'emotionIntensity'
    },
    {
      type: 'bot',
      content: "Agora me conte a história! 📝\n\nDescreva os fatos, momentos especiais, piadas internas, nomes importantes... Quanto mais detalhes, melhor será sua letra!",
      inputType: 'textarea',
      field: 'story'
    },
    {
      type: 'bot',
      content: "Você quer que a música tenha um trecho falado/declamado (spoken word)?\n\nIsso é um momento onde ao invés de cantar, há uma parte narrada/recitada.",
      inputType: 'yesno',
      field: 'hasMonologue'
    },
    {
      type: 'bot',
      content: "Em qual parte da música você quer o trecho falado?",
      inputType: 'options',
      field: 'monologuePosition',
      options: [
        { id: "intro", label: "🎬 No início (Intro)", description: "Abre com declamação" },
        { id: "bridge", label: "🌉 No meio (Bridge)", description: "Pausa emocional" },
        { id: "outro", label: "🎤 No final (Outro)", description: "Fecha com impacto" }
      ]
    },
    {
      type: 'bot',
      content: "Tem alguma palavra, nome ou frase que DEVE aparecer na letra? (opcional)\n\nSelecione as sugestões ou digite novas:",
      inputType: 'word-suggestions',
      field: 'mandatoryWords'
    },
    {
      type: 'bot',
      content: "Qual tipo de voz você prefere para sua música? 🎤",
      inputType: 'options',
      field: 'voiceType',
      options: [
        { id: "masculina", label: "👨 Voz Masculina", description: "Cantor solo masculino" },
        { id: "feminina", label: "👩 Voz Feminina", description: "Cantora solo feminina" },
        { id: "dueto", label: "👫 Dueto", description: "Homem e mulher cantando juntos" },
        { id: "dupla_masc", label: "👬 Dupla Masculina", description: "Dois cantores" },
        { id: "dupla_fem", label: "👭 Dupla Feminina", description: "Duas cantoras" },
        { id: "coral", label: "🎶 Coral/Grupo", description: "Múltiplas vozes" }
      ]
    },
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
    {
      type: 'bot',
      content: "Qual nome você quer dar para sua música?",
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

  // Extrair palavras-chave da história para sugestões
  const extractKeywords = (story: string): string[] => {
    if (!story) return [];
    
    // Palavras comuns para ignorar
    const stopWords = ['a', 'o', 'e', 'de', 'da', 'do', 'que', 'em', 'para', 'com', 'um', 'uma', 'os', 'as', 'no', 'na', 'por', 'mais', 'mas', 'foi', 'ser', 'tem', 'seu', 'sua', 'ele', 'ela', 'isso', 'esse', 'essa', 'como', 'quando', 'muito', 'nos', 'já', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'têm', 'numa', 'pelos', 'elas', 'qual', 'nós', 'lhe', 'deles', 'essas', 'esses', 'pelas', 'este', 'dele', 'tu', 'te', 'vocês', 'vos', 'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso', 'nossa', 'nossos', 'nossas', 'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'aquilo', 'estou', 'está', 'estamos', 'estão', 'estive', 'esteve', 'estivemos', 'estiveram', 'estava', 'estávamos', 'estavam', 'estivera', 'estivéramos', 'esteja', 'estejamos', 'estejam', 'estivesse', 'estivéssemos', 'estivessem', 'estiver', 'estivermos', 'estiverem', 'hei', 'há', 'havemos', 'hão', 'houve', 'houvemos', 'houveram', 'houvera', 'houvéramos', 'haja', 'hajamos', 'hajam', 'houvesse', 'houvéssemos', 'houvessem', 'houver', 'houvermos', 'houverem', 'houverei', 'houverá', 'houveremos', 'houverão', 'houveria', 'houveríamos', 'houveriam', 'sou', 'somos', 'são', 'era', 'éramos', 'eram', 'fui', 'fomos', 'foram', 'fora', 'fôramos', 'seja', 'sejamos', 'sejam', 'fosse', 'fôssemos', 'fossem', 'for', 'formos', 'forem', 'serei', 'será', 'seremos', 'serão', 'seria', 'seríamos', 'seriam', 'tenho', 'temos', 'tinha', 'tínhamos', 'tinham', 'tive', 'teve', 'tivemos', 'tiveram', 'tivera', 'tivéramos', 'tenha', 'tenhamos', 'tenham', 'tivesse', 'tivéssemos', 'tivessem', 'tiver', 'tivermos', 'tiverem', 'terei', 'terá', 'teremos', 'terão', 'teria', 'teríamos', 'teriam'];
    
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

  const getNextStep = (current: number, data: BriefingFormData): number => {
    // chatFlow indexes:
    // 0: musicType, 1: emotion, 2: emotionIntensity, 3: story
    // 4: hasMonologue, 5: monologuePosition, 6: mandatoryWords
    // 7: voiceType, 8: style, 9: rhythm, 10: atmosphere
    // 11: autoGenerateName, 12: songName
    
    // Se não quer monólogo, pula a pergunta de posição
    if (current === 4 && !data.hasMonologue) {
      return 6; // Pula para mandatoryWords
    }
    // Se escolheu gerar nome automaticamente, pula a pergunta de nome
    if (current === 11 && data.autoGenerateName) {
      return 13; // Fim - vai para confirmação
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
        newMessages.pop(); // Remove última mensagem
        newMessages.pop(); // Remove penúltima
      }
      return newMessages;
    });
    
    const previousStep = stepHistory[stepHistory.length - 1];
    setStepHistory(prev => prev.slice(0, -1));
    setCurrentStep(previousStep);
    setShowCustomStyleInput(false);
    setSelectedSuggestions([]);
    
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
        if (savedStep >= chatFlow.length) {
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

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
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

    const nextStep = currentStep + 1;
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

    const nextStep = currentStep + 1;
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
    if (field === 'story' && value.length < 50) {
      toast({
        title: 'História muito curta',
        description: 'Conte mais detalhes para uma letra melhor (mínimo 50 caracteres).',
        variant: 'destructive'
      });
      return;
    }

    // Campos opcionais podem ficar vazios
    if (!value && (field === 'mandatoryWords' || field === 'restrictedWords')) {
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
        })
        .select()
        .single();

      if (error) throw error;

      // Salvar dados completos no localStorage para uso posterior
      localStorage.setItem('briefingData', JSON.stringify({ ...briefingData, orderId: orderData.id }));
      
      // Redirecionar para checkout
      navigate(`/checkout/${orderData.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const getFieldLabel = (field: string, value: string | boolean | number): string => {
    const labelMaps: Record<string, Record<string, string>> = {
      musicType: {
        homenagem: "🎁 Homenagem",
        romantica: "❤️ Romântica",
        motivacional: "💪 Motivacional",
        infantil: "🎈 Infantil",
        religiosa: "✝️ Religiosa",
        parodia: "🎭 Paródia/Humor"
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
        outros: `✨ ${formData.customStyle}`
      },
      voiceType: {
        masculina: "👨 Voz Masculina",
        feminina: "👩 Voz Feminina",
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
        leve: "☁️ Leve"
      },
      monologuePosition: {
        intro: "🎬 Intro",
        bridge: "🌉 Bridge",
        outro: "🎤 Outro"
      }
    };

    if (typeof value === 'boolean') {
      return value ? "Sim" : "Não";
    }
    if (typeof value === 'number') {
      const labels = ['Muito sutil', 'Sutil', 'Moderada', 'Intensa', 'Muito intensa'];
      return `${value}/5 - ${labels[value - 1]}`;
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
              <p className="text-sm text-muted-foreground">Revise antes de criar sua música</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            <div className="bg-muted rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                🎵 Resumo da sua música
              </h2>
              
              <div className="space-y-3">
                <ConfirmationItem 
                  label="Tipo" 
                  value={getFieldLabel('musicType', formData.musicType)} 
                  onEdit={() => handleEditField(0)} 
                />
                <ConfirmationItem 
                  label="Emoção" 
                  value={getFieldLabel('emotion', formData.emotion)} 
                  onEdit={() => handleEditField(1)} 
                />
                <ConfirmationItem 
                  label="Intensidade" 
                  value={getFieldLabel('emotionIntensity', formData.emotionIntensity)} 
                  onEdit={() => handleEditField(2)} 
                />
                <ConfirmationItem 
                  label="História" 
                  value={formData.story.length > 100 ? formData.story.substring(0, 100) + "..." : formData.story} 
                  onEdit={() => handleEditField(3)} 
                />
                <ConfirmationItem 
                  label="Trecho falado" 
                  value={formData.hasMonologue ? `Sim - ${getFieldLabel('monologuePosition', formData.monologuePosition)}` : "Não"} 
                  onEdit={() => handleEditField(4)} 
                />
                <ConfirmationItem 
                  label="Palavras obrigatórias" 
                  value={formData.mandatoryWords || "(nenhuma)"} 
                  onEdit={() => handleEditField(6)} 
                />
                <ConfirmationItem 
                  label="Tipo de voz" 
                  value={getFieldLabel('voiceType', formData.voiceType)} 
                  onEdit={() => handleEditField(7)} 
                />
                <ConfirmationItem 
                  label="Estilo" 
                  value={getFieldLabel('style', formData.style)} 
                  onEdit={() => handleEditField(8)} 
                />
                <ConfirmationItem 
                  label="Ritmo" 
                  value={getFieldLabel('rhythm', formData.rhythm)} 
                  onEdit={() => handleEditField(9)} 
                />
                <ConfirmationItem 
                  label="Atmosfera" 
                  value={getFieldLabel('atmosphere', formData.atmosphere)} 
                  onEdit={() => handleEditField(10)} 
                />
                <ConfirmationItem 
                  label="Nome da música" 
                  value={formData.autoGenerateName ? "Gerado pela IA" : formData.songName} 
                  onEdit={() => handleEditField(11)} 
                />
              </div>
            </div>

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
          {stepHistory.length > 0 && (
            <Button variant="ghost" size="icon" onClick={handleGoBack} className="mr-1">
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
            {(currentBotMessage.field === 'restrictedWords') && (
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
