import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Sparkles, ArrowRight, ArrowLeft, CheckCircle, Edit3, RefreshCw, Download, AlertTriangle, Info, Undo2, Shield } from "lucide-react";
import MusicLoadingSpinner from "@/components/MusicLoadingSpinner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PronunciationModal from "@/components/PronunciationModal";
import { useTranslation } from "react-i18next";

interface LyricOption {
  id: string;
  version: string;
  title: string;
  body: string;
}

interface BriefingData {
  musicType: string;
  emotion: string;
  emotionIntensity: number;
  story: string;
  structure: string[];
  hasMonologue: boolean;
  monologuePosition: string;
  mandatoryWords: string;
  restrictedWords: string;
  style: string;
  rhythm: string;
  atmosphere: string;
  songName: string;
  autoGenerateName: boolean;
  plan: string;
  lgpdConsent: boolean;
  voiceType?: string;
  hasCustomLyric?: boolean;
}

interface Pronunciation {
  term: string;
  phonetic: string;
}

type Step = "loading" | "generating" | "select" | "editing" | "editing-modified" | "approved" | "complete";

// Auto-redirect effect for complete step
const useAutoRedirect = (step: Step, navigate: ReturnType<typeof useNavigate>) => {
  useEffect(() => {
    if (step === 'complete') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);
};

const CreateSong = () => {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("loading");
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricOption[]>([]);
  const [selectedLyric, setSelectedLyric] = useState<LyricOption | null>(null);
  const [originalSelectedLyric, setOriginalSelectedLyric] = useState<LyricOption | null>(null);
  const [modifiedLyric, setModifiedLyric] = useState<LyricOption | null>(null);
  const [editedLyric, setEditedLyric] = useState<string>("");
  const [editedTitle, setEditedTitle] = useState<string>("");
  const [editInstructions, setEditInstructions] = useState<string>("");
  const [hasUsedModification, setHasUsedModification] = useState(false);
  const [isModifiedSelected, setIsModifiedSelected] = useState(false); // Track which version is selected in editing-modified step
  const [loading, setLoading] = useState(false);
  
  // Pronunciation modal state
  const [showPronunciationModal, setShowPronunciationModal] = useState(false);
  const [missingPronunciations, setMissingPronunciations] = useState<string[]>([]);
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([]);

  // Auto-redirect to dashboard after complete
  useAutoRedirect(step, navigate);


  // Carregar dados do briefing OU order existente (voucher flow)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    const urlOrderId = searchParams.get('orderId');
    
    // VOUCHER FLOW: Se tem orderId na URL, buscar order e letras existentes
    if (urlOrderId) {
      loadExistingOrder(urlOrderId);
      return;
    }

    // NORMAL FLOW: Verificar briefingData no localStorage
    const data = localStorage.getItem('briefingData');
    if (!data) {
      navigate('/briefing');
      return;
    }
    
    const parsed = JSON.parse(data) as BriefingData;
    setBriefingData(parsed);
    localStorage.removeItem('briefingData');
    
    // Iniciar geração de letras automaticamente
    generateLyrics(parsed);
  }, [authLoading, user, searchParams]);

  // Função para carregar order existente (voucher 100% flow)
  const loadExistingOrder = async (existingOrderId: string) => {
    setStep("loading");
    
    try {
      // 1. Buscar order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', existingOrderId)
        .single();

      if (orderError) throw orderError;
      
      // Verificar se pertence ao usuário
      if (orderData.user_id !== user?.id) {
        toast.error(t('createSong.orderNotYours'));
        navigate('/dashboard');
        return;
      }

      setOrderId(existingOrderId);

      // 2. Se tem letra customizada, ir direto para geração de style prompt
      if (orderData.has_custom_lyric) {
        // Criar lyric fictícia com a letra do story (que contém a letra customizada)
        const customLyric: LyricOption = {
          id: 'custom',
          version: 'A',
          title: orderData.song_title || t('createSong.myLetter'),
          body: orderData.story || ''
        };
        setLyrics([customLyric]);
        setSelectedLyric(customLyric);
        setEditedLyric(customLyric.body);
        setEditedTitle(customLyric.title);
        
        // Reconstruir briefingData para letra customizada
        const customBriefing: BriefingData = {
          musicType: orderData.music_type || 'homenagem',
          emotion: orderData.emotion || 'alegria',
          emotionIntensity: orderData.emotion_intensity || 3,
          story: orderData.story || '',
          structure: [],
          hasMonologue: false,
          monologuePosition: '',
          mandatoryWords: '',
          restrictedWords: '',
          style: orderData.music_style || 'pop',
          rhythm: orderData.rhythm || 'moderado',
          atmosphere: orderData.atmosphere || 'festivo',
          songName: orderData.song_title || '',
          autoGenerateName: !orderData.song_title,
          plan: 'single',
          lgpdConsent: true,
          voiceType: orderData.voice_type || 'feminina',
          hasCustomLyric: true
        };
        setBriefingData(customBriefing);
        
        // Ir direto para a etapa de edição/aprovação
        setStep("editing");
        toast.info(t('createSong.reviewYourLyric'));
        return;
      }

      // 3. Reconstruir briefingData da order
      const reconstructedBriefing: BriefingData = {
        musicType: orderData.music_type || 'homenagem',
        emotion: orderData.emotion || 'alegria',
        emotionIntensity: orderData.emotion_intensity || 3,
        story: orderData.story || '',
        structure: orderData.music_structure?.split(',') || ['verse', 'chorus'],
        hasMonologue: orderData.has_monologue || false,
        monologuePosition: orderData.monologue_position || 'bridge',
        mandatoryWords: orderData.mandatory_words || '',
        restrictedWords: orderData.restricted_words || '',
        style: orderData.music_style || 'pop',
        rhythm: orderData.rhythm || 'moderado',
        atmosphere: orderData.atmosphere || 'festivo',
        songName: orderData.song_title || '',
        autoGenerateName: !orderData.song_title,
        plan: 'single',
        lgpdConsent: true,
        voiceType: orderData.voice_type || 'feminina',
        hasCustomLyric: orderData.has_custom_lyric || false
      };
      setBriefingData(reconstructedBriefing);

      // 3. Buscar letras já geradas
      const { data: lyricsData, error: lyricsError } = await supabase
        .from('lyrics')
        .select('*')
        .eq('order_id', existingOrderId)
        .order('created_at', { ascending: true });

      if (lyricsError) throw lyricsError;

      if (lyricsData && lyricsData.length > 0) {
        // Letras já existem - exibir para seleção
        const existingLyrics: LyricOption[] = lyricsData.map((l, idx) => ({
          id: l.id,
          version: l.version || String.fromCharCode(65 + idx),
          title: l.title || `${t('createSong.version', { version: String.fromCharCode(65 + idx) })}`,
          body: l.body || ""
        }));
        setLyrics(existingLyrics);
        setStep("select");
        toast.success(t('createSong.lyricsReady'), {
          description: t('createSong.chooseVersions')
        });
      } else {
        // Aguardar letras (podem estar sendo geradas)
        setStep("generating");
        toast.info(t('createSong.waitingLyrics'), {
          description: t('createSong.lyricsBeingGenerated')
        });
        
        // Poll a cada 3 segundos por até 60 segundos
        let attempts = 0;
        const maxAttempts = 20;
        const pollInterval = setInterval(async () => {
          attempts++;
          const { data: newLyrics } = await supabase
            .from('lyrics')
            .select('*')
            .eq('order_id', existingOrderId)
            .order('created_at', { ascending: true });
          
          if (newLyrics && newLyrics.length > 0) {
            clearInterval(pollInterval);
            const existingLyrics: LyricOption[] = newLyrics.map((l, idx) => ({
              id: l.id,
              version: l.version || String.fromCharCode(65 + idx),
              title: l.title || `${t('createSong.version', { version: String.fromCharCode(65 + idx) })}`,
              body: l.body || ""
            }));
            setLyrics(existingLyrics);
            setStep("select");
            toast.success(t('createSong.lyricsReadyToast'));
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            toast.error(t('createSong.lyricsNotAvailable'), {
              description: t('createSong.tryRefresh')
            });
            setStep("loading");
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Erro ao carregar order:", error);
      const errorMessage = error instanceof Error ? error.message : t('createSong.unknownError');
      toast.error(t('createSong.loadOrderError'), { description: errorMessage });
      navigate('/dashboard');
    }
  };

  const generateLyrics = async (briefing: BriefingData) => {
    if (!user) {
      toast.error(t('createSong.needLogin'));
      navigate('/auth');
      return;
    }

    setStep("generating");
    setLoading(true);

    try {
      // Criar order no Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          status: 'DRAFT',
          music_style: briefing.style,
          emotion: briefing.emotion,
          tone: briefing.rhythm,
          music_structure: briefing.structure.join(','),
          story: briefing.story,
          music_type: briefing.musicType,
          emotion_intensity: briefing.emotionIntensity,
          rhythm: briefing.rhythm,
          atmosphere: briefing.atmosphere,
          has_monologue: briefing.hasMonologue,
          monologue_position: briefing.monologuePosition,
          mandatory_words: briefing.mandatoryWords,
          restricted_words: briefing.restrictedWords
        })
        .select()
        .single();

      if (orderError) {
        console.error("Erro ao criar order:", orderError);
        throw new Error(t('createSong.createOrderError'));
      }

      setOrderId(orderData.id);

      // Chamar Edge Function para gerar letras
      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: {
          orderId: orderData.id,
          story: briefing.story,
          briefing: {
            musicType: briefing.musicType,
            emotion: briefing.emotion,
            emotionIntensity: briefing.emotionIntensity,
            style: briefing.style,
            rhythm: briefing.rhythm,
            atmosphere: briefing.atmosphere,
            structure: briefing.structure,
            hasMonologue: briefing.hasMonologue,
            monologuePosition: briefing.monologuePosition,
            mandatoryWords: briefing.mandatoryWords,
            restrictedWords: briefing.restrictedWords,
            songName: briefing.songName,
            autoGenerateName: briefing.autoGenerateName
          }
        }
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.error || t('createSong.lyricsGenerationError'));
      }

      // Processar letras recebidas
      const generatedLyrics: LyricOption[] = data.lyrics.map((l: any, idx: number) => ({
        id: l.id || `lyric-${idx}`,
        version: String.fromCharCode(65 + idx), // A, B
        title: l.title || `${t('createSong.version', { version: String.fromCharCode(65 + idx) })}`,
        body: l.text || l.body || ""
      }));

      setLyrics(generatedLyrics);
      setStep("select");
      toast.success(t('createSong.generationSuccess'), {
        description: t('createSong.chooseVersionsCreated')
      });

    } catch (error) {
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : t('createSong.unknownError');
      toast.error(t('createSong.generateError'), { description: errorMessage });
      setStep("loading");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLyric = (lyric: LyricOption) => {
    setSelectedLyric(lyric);
    setOriginalSelectedLyric(lyric);
    setEditedLyric(lyric.body);
    // CRITICAL: Preserve user-provided title from briefing if available
    // Only use lyric.title if user didn't provide a custom songName
    const userProvidedTitle = briefingData?.songName && !briefingData?.autoGenerateName 
      ? briefingData.songName 
      : lyric.title;
    setEditedTitle(userProvidedTitle);
    setStep("editing");
  };

  const handleSelectModifiedOrOriginal = (useModified: boolean) => {
    setIsModifiedSelected(useModified);
    if (useModified && modifiedLyric) {
      setEditedLyric(modifiedLyric.body);
      setEditedTitle(modifiedLyric.title);
    } else if (originalSelectedLyric) {
      setEditedLyric(originalSelectedLyric.body);
      setEditedTitle(originalSelectedLyric.title);
    }
  };

  const handleApproveLyric = async (customPronunciations?: Pronunciation[]) => {
    // Determine which lyric is being approved: modified, original, or custom
    const isUsingModified = hasUsedModification && modifiedLyric && isModifiedSelected;
    const effectiveLyric = isUsingModified ? modifiedLyric : selectedLyric;
    
    console.log("handleApproveLyric called", {
      selectedLyric: selectedLyric?.id,
      modifiedLyric: modifiedLyric?.id,
      effectiveLyric: effectiveLyric?.id,
      isUsingModified,
      orderId,
      editedLyric: editedLyric?.substring(0, 50),
      editedLyricLength: editedLyric?.length,
      briefingData: briefingData ? 'exists' : 'null',
      hasCustomLyric: briefingData?.hasCustomLyric
    });
    
    // Para letras customizadas, podemos aprovar mesmo sem selectedLyric já que temos editedLyric
    const isCustomLyric = briefingData?.hasCustomLyric === true;
    
    if (!isCustomLyric && !effectiveLyric) {
      console.error("Missing effectiveLyric for non-custom lyric");
      toast.error(t('createSong.incompleteData'), { description: t('createSong.selectLyricFirst') });
      return;
    }
    
    if (!orderId || !briefingData) {
      console.error("Missing required data:", { orderId: !!orderId, briefingData: !!briefingData });
      toast.error(t('createSong.incompleteData'), { description: t('createSong.orderDataNotFound') });
      return;
    }
    
    if (!editedLyric || editedLyric.trim().length === 0) {
      console.error("editedLyric is empty!");
      toast.error(t('createSong.emptyLyric'), { description: t('createSong.lyricNotLoaded') });
      return;
    }

    setLoading(true);
    setStep("approved");

    try {
      // Chamar Edge Function para gerar o Style Prompt (sem exibir ao usuário)
      // Use modified lyric ID if user is approving the modified version, original otherwise
      // For custom lyrics, use 'custom' as lyricId
      const lyricId = effectiveLyric?.id || 'custom';
      
      const { data, error } = await supabase.functions.invoke('generate-style-prompt', {
        body: {
          orderId,
          lyricId: lyricId,
          approvedLyrics: editedLyric,
          songTitle: editedTitle,
          pronunciations: customPronunciations || pronunciations,
          hasCustomLyric: briefingData.hasCustomLyric || false,
          briefing: {
            musicType: briefingData.musicType,
            emotion: briefingData.emotion,
            emotionIntensity: briefingData.emotionIntensity,
            style: briefingData.style,
            rhythm: briefingData.rhythm,
            atmosphere: briefingData.atmosphere,
            hasMonologue: briefingData.hasMonologue,
            voiceType: briefingData.voiceType || 'feminina'
          }
        }
      });

      // Handle edge function errors - extract message from response body if available
      if (error) {
        // Try to extract error details from the error context
        const errorContext = (error as any)?.context;
        let errorData: any = null;
        
        // Try to parse error body from context or message
        try {
          if (errorContext?.body) {
            errorData = typeof errorContext.body === 'string' 
              ? JSON.parse(errorContext.body) 
              : errorContext.body;
          } else {
            // Try to extract JSON from error message (e.g. "status code 400, body {...}")
            const messageMatch = error.message?.match(/body\s*({.+})/);
            if (messageMatch) {
              errorData = JSON.parse(messageMatch[1]);
            }
          }
        } catch (e) {
          // Parsing failed, continue with original error
        }

        // Check if it's a pronunciation error from the parsed error data
        if (errorData?.missingPronunciations && errorData.missingPronunciations.length > 0) {
          setMissingPronunciations(errorData.missingPronunciations);
          setShowPronunciationModal(true);
          setStep(hasUsedModification ? "editing-modified" : "editing");
          setLoading(false);
          toast.warning(t('createSong.pronunciationNeeded'), {
            description: t('createSong.definePronunciation', { terms: errorData.missingPronunciations.join(', ') })
          });
          return;
        }

        // If we have a parsed error message, use it
        if (errorData?.error) {
          throw new Error(errorData.error);
        }
        
        throw error;
      }

      if (!data?.ok) {
        // Check if it's a pronunciation error
        if (data?.missingPronunciations && data.missingPronunciations.length > 0) {
          setMissingPronunciations(data.missingPronunciations);
          setShowPronunciationModal(true);
          setStep(hasUsedModification ? "editing-modified" : "editing");
          setLoading(false);
          toast.warning(t('createSong.pronunciationNeeded'), {
            description: t('createSong.definePronunciation', { terms: data.missingPronunciations.join(', ') })
          });
          return;
        }
        throw new Error(data?.error || t('createSong.stylePromptError'));
      }

      setStep("complete");

      toast.success(t('createSong.lyricApproved'), {
        description: t('createSong.readyForProduction')
      });

    } catch (error) {
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : t('createSong.unknownError');
      
      // Check for pronunciation error in the message
      if (errorMessage.includes("sem pronúncia definida")) {
        const match = errorMessage.match(/Termo\(s\) detectado\(s\) sem pronúncia definida: ([^.]+)/);
        if (match) {
          const terms = match[1].split(', ').map(t => t.trim());
          setMissingPronunciations(terms);
          setShowPronunciationModal(true);
          setStep(hasUsedModification ? "editing-modified" : "editing");
          setLoading(false);
          toast.warning(t('createSong.pronunciationNeeded'), {
            description: t('createSong.definePronunciation', { terms: terms.join(', ') })
          });
          return;
        }
      }
      
      // Better error messages for users
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes("Limite de requisições")) {
        userFriendlyMessage = t('createSong.rateLimitError');
      } else if (errorMessage.includes("Créditos insuficientes")) {
        userFriendlyMessage = t('createSong.internalError');
      }
      
      toast.error(t('createSong.approvalError'), { 
        description: userFriendlyMessage,
        duration: 5000 
      });
      setStep(hasUsedModification ? "editing-modified" : "editing");
    } finally {
      setLoading(false);
    }
  };

  const handlePronunciationSubmit = (newPronunciations: Pronunciation[]) => {
    setPronunciations(newPronunciations);
    setShowPronunciationModal(false);
    handleApproveLyric(newPronunciations);
  };

  const handleRequestEdit = async () => {
    if (!orderId || !briefingData || !editInstructions.trim()) {
      toast.error(t('createSong.describeChanges'));
      return;
    }

    if (hasUsedModification) {
      toast.error(t('createSong.alreadyUsedModification'));
      return;
    }

    setLoading(true);
    setStep("generating");

    try {
      // Regenerar com as instruções de edição
      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: {
          orderId,
          story: `${briefingData.story}\n\n[INSTRUÇÕES DE AJUSTE DO USUÁRIO]: ${editInstructions}\n\n[LETRA ANTERIOR PARA REFERÊNCIA]:\n${editedLyric}`,
          briefing: {
            musicType: briefingData.musicType,
            emotion: briefingData.emotion,
            emotionIntensity: briefingData.emotionIntensity,
            style: briefingData.style,
            rhythm: briefingData.rhythm,
            atmosphere: briefingData.atmosphere,
            structure: briefingData.structure,
            hasMonologue: briefingData.hasMonologue,
            monologuePosition: briefingData.monologuePosition,
            mandatoryWords: briefingData.mandatoryWords,
            restrictedWords: briefingData.restrictedWords,
            songName: briefingData.songName,
            autoGenerateName: briefingData.autoGenerateName
          },
          isModification: true
        }
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.error || t('createSong.regenerateLyricError'));
      }

      // Pegar primeira versão modificada
      const modifiedLyricData: LyricOption = {
        id: data.lyrics[0]?.id || `lyric-modified`,
        version: "Modificada",
        title: data.lyrics[0]?.title || editedTitle,
        body: data.lyrics[0]?.text || data.lyrics[0]?.body || ""
      };

      setModifiedLyric(modifiedLyricData);
      setEditedLyric(modifiedLyricData.body);
      setEditedTitle(modifiedLyricData.title);
      setHasUsedModification(true);
      setIsModifiedSelected(true); // Auto-select the modified version
      setEditInstructions("");
      setStep("editing-modified");
      
      toast.success(t('createSong.modifiedLyricGenerated'), {
        description: t('createSong.chooseOriginalOrModified')
      });

    } catch (error) {
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : t('createSong.unknownError');
      toast.error(t('createSong.regenerateError'), { description: errorMessage });
      setStep("editing");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (step === "loading" || step === "generating") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <MusicLoadingSpinner 
            size="lg" 
            message={step === "generating" ? t('createSong.generatingLyrics') : tc('loading')}
            description={step === "generating" 
              ? t('createSong.generatingDescription')
              : t('createSong.loadingBriefing')
            }
          />
        </Card>
      </div>
    );
  }

  // Step 1: Select lyrics
  if (step === "select") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4">{t('createSong.step1of2')}</Badge>
            <h1 className="text-3xl font-bold mb-2">{t('createSong.chooseYourLyrics')}</h1>
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('createSong.generatedVersions') }} />
          </div>

          {/* Info Box - Importance of briefing */}
          <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-500 mb-1">{t('createSong.tipImportant')}</p>
                  <p className="text-muted-foreground">
                    {t('createSong.tipDescription')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lyrics Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {lyrics.map((lyric) => (
              <Card
                key={lyric.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50"
                onClick={() => handleSelectLyric(lyric)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{lyric.title}</CardTitle>
                    <Badge variant="secondary">{t('createSong.version', { version: lyric.version })}</Badge>
                  </div>
                  <CardDescription>{t('createSong.clickToSelect')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-lg max-h-80 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {lyric.body}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Back button */}
          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/briefing')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('createSong.backToBriefing')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Edit/Approve lyrics (before modification)
  if (step === "editing") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4">{t('createSong.step1of2Review')}</Badge>
            <h1 className="text-3xl font-bold mb-2">{t('createSong.reviewYourLyrics')}</h1>
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('createSong.approveOrModify') }} />
          </div>

          {/* Song Title */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                {t('createSong.songName')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder={t('createSong.songNamePlaceholder')}
                className="text-lg font-semibold"
              />
            </CardContent>
          </Card>

          {/* Selected Lyric */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('createSong.lyrics')}</CardTitle>
                <Badge>{t('createSong.version', { version: selectedLyric?.version })}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {editedLyric}
                </pre>
              </div>

              {/* Edit Instructions */}
              <div className="border-t pt-4 mt-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-500 mb-1">{t('createSong.warningOneModification')}</p>
                      <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('createSong.modificationOptional') }} />
                    </div>
                  </div>
                </div>
                
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  {t('createSong.requestModification')}
                </h4>
                <Textarea
                  placeholder={t('createSong.modificationPlaceholder')}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={3}
                  className="mb-4"
                />
              </div>
            </CardContent>
          </Card>

          {/* No refunds warning */}
          <Card className="mb-6 border-red-500/30 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-500 mb-1">{t('createSong.noRefunds')}</p>
                  <p className="text-muted-foreground">
                    {t('createSong.reviewCarefully')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Only show "Escolher Outra Versão" if NOT custom lyrics */}
            {!briefingData?.hasCustomLyric && (
              <Button
                variant="outline"
                onClick={() => setStep("select")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('createSong.chooseOtherVersion')}
              </Button>
            )}

            {editInstructions.trim() && (
              <Button
                variant="secondary"
                onClick={handleRequestEdit}
                disabled={loading}
              >
                {loading ? (
                  <Music className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {t('createSong.modifyLyric')}
              </Button>
            )}

            <Button
              onClick={() => handleApproveLyric()}
              disabled={loading || !editedTitle.trim()}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {loading ? (
                <Music className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {t('createSong.approveAndProduce')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2B: After modification - choose between original and modified
  if (step === "editing-modified") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
              {t('createSong.modificationUsed')}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{t('createSong.chooseFinalVersion')}</h1>
            <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('createSong.compareVersions') }} />
          </div>

          {/* Song Title */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                {t('createSong.songName')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder={t('createSong.songNamePlaceholder')}
                className="text-lg font-semibold"
              />
            </CardContent>
          </Card>

          {/* Compare versions */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Original */}
            <Card 
              className={`cursor-pointer transition-all ${!isModifiedSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
              onClick={() => handleSelectModifiedOrOriginal(false)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Undo2 className="w-4 h-4" />
                    {t('createSong.originalVersion')}
                  </CardTitle>
                  <Badge variant="outline">{t('createSong.version', { version: originalSelectedLyric?.version })}</Badge>
                </div>
                <CardDescription>{t('createSong.yourInitialChoice')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {originalSelectedLyric?.body}
                  </pre>
                </div>
                {!isModifiedSelected && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('createSong.selected')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modified */}
            <Card 
              className={`cursor-pointer transition-all ${isModifiedSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
              onClick={() => handleSelectModifiedOrOriginal(true)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t('createSong.modifiedVersion')}
                  </CardTitle>
                  <Badge>{t('createSong.new')}</Badge>
                </div>
                <CardDescription>{t('createSong.withYourChanges')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {modifiedLyric?.body}
                  </pre>
                </div>
                {isModifiedSelected && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('createSong.selected')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* No refunds warning */}
          <Card className="mb-6 border-red-500/30 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-500 mb-1">{t('createSong.noRefunds')}</p>
                  <p className="text-muted-foreground">
                    {t('createSong.lastChance')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => handleApproveLyric()}
              disabled={loading || !editedTitle.trim()}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {loading ? (
                <Music className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {t('createSong.approveSelectedVersion')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Approved state
  if (step === "approved") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <MusicLoadingSpinner 
            size="lg" 
            message={t('createSong.finalizing')}
            description={t('createSong.preparingForProduction')}
          />
        </Card>
      </div>
    );
  }

  // Complete - Ready for music production
  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <Badge className="mb-4 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
              {t('createSong.step1Complete')}
            </Badge>
            <h1 className="text-3xl font-bold mb-2">{t('createSong.lyricApprovedTitle')}</h1>
            <p className="text-muted-foreground">
              {t('createSong.readyForStep2')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('createSong.redirectingToDashboard', 'Redirecionando para o painel em 3 segundos...')}
            </p>
          </div>

          {/* Approved Lyric */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                {editedTitle}
              </CardTitle>
              <CardDescription>{t('createSong.approvedLyric')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {editedLyric}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('createSong.nextSteps')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">✓</div>
                <span>{t('createSong.personalizedLyricApproved')}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">✓</div>
                <span>{t('createSong.musicalStyleConfigured')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">2</div>
                <span className="font-medium">{t('createSong.musicProductionSoon')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowRight className="w-4 h-4 mr-2" />
              {t('createSong.goToDashboard')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PronunciationModal
        open={showPronunciationModal}
        onClose={() => setShowPronunciationModal(false)}
        missingTerms={missingPronunciations}
        onSubmit={handlePronunciationSubmit}
        loading={loading}
      />
    </>
  );
};

export default CreateSong;
