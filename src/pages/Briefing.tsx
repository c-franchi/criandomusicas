import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Music, Send, Bot, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  options?: { id: string; label: string; description?: string }[];
  field?: keyof BriefingFormData;
  inputType?: 'text' | 'textarea' | 'options' | 'intensity' | 'yesno';
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
  rhythm: string;
  atmosphere: string;
  songName: string;
  autoGenerateName: boolean;
}

const Briefing = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [formData, setFormData] = useState<BriefingFormData>({
    musicType: "",
    emotion: "",
    emotionIntensity: 3,
    story: "",
    hasMonologue: false,
    monologuePosition: "",
    mandatoryWords: "",
    restrictedWords: "",
    style: "",
    rhythm: "",
    atmosphere: "",
    songName: "",
    autoGenerateName: true
  });

  const userPlan = profile?.plan || "free";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Iniciar chat
  useEffect(() => {
    const timer = setTimeout(() => {
      addBotMessage(chatFlow[0]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
      content: "Tem alguma palavra, nome ou frase que DEVE aparecer na letra? (opcional)\n\nEx: Maria, amor da minha vida, nosso lugar especial...",
      inputType: 'text',
      field: 'mandatoryWords'
    },
    {
      type: 'bot',
      content: "Algum assunto que NÃO pode ser mencionado? (opcional)\n\nEx: ex-namorados, trabalho, dinheiro...",
      inputType: 'text',
      field: 'restrictedWords'
    },
    {
      type: 'bot',
      content: "Qual estilo musical você prefere?",
      inputType: 'options',
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
        { id: "bossa", label: "🎹 Bossa Nova" }
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
    // Se não quer monólogo, pula a pergunta de posição
    if (current === 4 && !data.hasMonologue) {
      return 6; // Pula para mandatoryWords
    }
    // Se escolheu gerar nome automaticamente, pula a pergunta de nome
    if (current === 11 && data.autoGenerateName) {
      return 13; // Fim
    }
    return current + 1;
  };

  const handleOptionSelect = (option: { id: string; label: string }) => {
    const currentMsg = messages[messages.length - 1];
    if (!currentMsg?.field) return;

    const field = currentMsg.field;
    let displayValue = option.label;

    // Handle special cases
    if (field === 'autoGenerateName') {
      const isAuto = option.id === 'auto';
      setFormData(prev => ({ ...prev, autoGenerateName: isAuto, songName: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: option.id }));
    }

    addUserMessage(displayValue);

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
      finishBriefing(updatedFormData as BriefingFormData);
    }
  };

  const handleYesNo = (yes: boolean) => {
    const currentMsg = messages[messages.length - 1];
    if (!currentMsg?.field) return;

    setFormData(prev => ({ ...prev, [currentMsg.field!]: yes }));
    addUserMessage(yes ? "✅ Sim" : "❌ Não");

    const nextStep = getNextStep(currentStep, { ...formData, [currentMsg.field]: yes });
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      finishBriefing({ ...formData, [currentMsg.field]: yes } as BriefingFormData);
    }
  };

  const handleIntensitySelect = (value: number) => {
    setFormData(prev => ({ ...prev, emotionIntensity: value }));
    const labels = ['Muito sutil', 'Sutil', 'Moderada', 'Intensa', 'Muito intensa'];
    addUserMessage(`${value}/5 - ${labels[value - 1]}`);

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

    const nextStep = getNextStep(currentStep, { ...formData, [field]: value });
    setCurrentStep(nextStep);

    if (nextStep < chatFlow.length) {
      setTimeout(() => {
        addBotMessage(chatFlow[nextStep]);
      }, 500);
    } else {
      finishBriefing({ ...formData, [field]: value } as BriefingFormData);
    }
  };

  const finishBriefing = (data: BriefingFormData) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        type: 'bot',
        content: `Perfeito! 🎉\n\nResumo da sua música:\n• Tipo: ${data.musicType}\n• Emoção: ${data.emotion}\n• Estilo: ${data.style}\n• Ritmo: ${data.rhythm}\n${data.hasMonologue ? '• Com trecho declamado' : ''}\n${data.songName ? `• Nome: ${data.songName}` : '• Nome: gerado pela IA'}\n\nVou criar duas versões da letra para você escolher!`
      }]);

      // Salvar e navegar
      setTimeout(() => {
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
          style: data.style,
          rhythm: data.rhythm,
          atmosphere: data.atmosphere,
          songName: data.songName,
          autoGenerateName: data.autoGenerateName,
          plan: userPlan,
          lgpdConsent: true
        };

        localStorage.setItem('briefingData', JSON.stringify(briefingData));
        navigate('/create-song');
      }, 2000);
    }, 1000);
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
  const showInput = currentBotMessage?.type === 'bot' && currentBotMessage?.inputType;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
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
              <div className="flex gap-2">
                {currentBotMessage.inputType === 'textarea' ? (
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Digite aqui..."
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
                <Button onClick={handleTextSubmit}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Skip button for optional fields */}
            {(currentBotMessage.field === 'mandatoryWords' || currentBotMessage.field === 'restrictedWords') && (
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

export default Briefing;
