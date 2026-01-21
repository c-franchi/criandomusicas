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
}

interface Pronunciation {
  term: string;
  phonetic: string;
}

type Step = "loading" | "generating" | "select" | "editing" | "editing-modified" | "approved" | "complete";

const CreateSong = () => {
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
  const [loading, setLoading] = useState(false);
  
  // Pronunciation modal state
  const [showPronunciationModal, setShowPronunciationModal] = useState(false);
  const [missingPronunciations, setMissingPronunciations] = useState<string[]>([]);
  const [pronunciations, setPronunciations] = useState<Pronunciation[]>([]);


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
        toast.error("Este pedido não pertence a você");
        navigate('/dashboard');
        return;
      }

      setOrderId(existingOrderId);

      // 2. Reconstruir briefingData da order
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
        songName: '',
        autoGenerateName: true,
        plan: 'single',
        lgpdConsent: true
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
          title: l.title || `Versão ${String.fromCharCode(65 + idx)}`,
          body: l.body || ""
        }));
        setLyrics(existingLyrics);
        setStep("select");
        toast.success("Suas letras estão prontas!", {
          description: "Escolha entre as versões criadas para você"
        });
      } else {
        // Aguardar letras (podem estar sendo geradas)
        setStep("generating");
        toast.info("Aguardando letras...", {
          description: "Suas letras estão sendo geradas"
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
              title: l.title || `Versão ${String.fromCharCode(65 + idx)}`,
              body: l.body || ""
            }));
            setLyrics(existingLyrics);
            setStep("select");
            toast.success("Letras prontas!");
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            toast.error("Letras ainda não disponíveis", {
              description: "Tente atualizar a página em alguns segundos"
            });
            setStep("loading");
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Erro ao carregar order:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao carregar pedido", { description: errorMessage });
      navigate('/dashboard');
    }
  };

  const generateLyrics = async (briefing: BriefingData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
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
        throw new Error("Erro ao criar pedido. Tente novamente.");
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
        throw new Error(data?.error || "Erro ao gerar letras");
      }

      // Processar letras recebidas
      const generatedLyrics: LyricOption[] = data.lyrics.map((l: any, idx: number) => ({
        id: l.id || `lyric-${idx}`,
        version: String.fromCharCode(65 + idx), // A, B
        title: l.title || `Versão ${String.fromCharCode(65 + idx)}`,
        body: l.text || l.body || ""
      }));

      setLyrics(generatedLyrics);
      setStep("select");
      toast.success("Letras geradas com sucesso!", {
        description: "Escolha entre as 2 versões criadas para você"
      });

    } catch (error) {
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao gerar letras", { description: errorMessage });
      setStep("loading");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLyric = (lyric: LyricOption) => {
    setSelectedLyric(lyric);
    setOriginalSelectedLyric(lyric);
    setEditedLyric(lyric.body);
    setEditedTitle(lyric.title);
    setStep("editing");
  };

  const handleSelectModifiedOrOriginal = (useModified: boolean) => {
    if (useModified && modifiedLyric) {
      setEditedLyric(modifiedLyric.body);
      setEditedTitle(modifiedLyric.title);
    } else if (originalSelectedLyric) {
      setEditedLyric(originalSelectedLyric.body);
      setEditedTitle(originalSelectedLyric.title);
    }
  };

  const handleApproveLyric = async (customPronunciations?: Pronunciation[]) => {
    if (!selectedLyric || !orderId || !briefingData) return;

    setLoading(true);
    setStep("approved");

    try {
      // Chamar Edge Function para gerar o Style Prompt (sem exibir ao usuário)
      const { data, error } = await supabase.functions.invoke('generate-style-prompt', {
        body: {
          orderId,
          lyricId: selectedLyric.id,
          approvedLyrics: editedLyric,
          songTitle: editedTitle,
          pronunciations: customPronunciations || pronunciations,
          briefing: {
            musicType: briefingData.musicType,
            emotion: briefingData.emotion,
            emotionIntensity: briefingData.emotionIntensity,
            style: briefingData.style,
            rhythm: briefingData.rhythm,
            atmosphere: briefingData.atmosphere,
            hasMonologue: briefingData.hasMonologue
          }
        }
      });

      if (error) throw error;

      if (!data?.ok) {
        // Check if it's a pronunciation error
        if (data?.missingPronunciations && data.missingPronunciations.length > 0) {
          setMissingPronunciations(data.missingPronunciations);
          setShowPronunciationModal(true);
          setStep(hasUsedModification ? "editing-modified" : "editing");
          setLoading(false);
          toast.warning("Pronúncia necessária", {
            description: `Defina como pronunciar: ${data.missingPronunciations.join(', ')}`
          });
          return;
        }
        throw new Error(data?.error || "Erro ao gerar prompt de estilo");
      }

      setStep("complete");

      toast.success("🎵 Letra aprovada!", {
        description: "Sua música está pronta para produção!"
      });

    } catch (error) {
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Check for pronunciation error in the message
      if (errorMessage.includes("sem pronúncia definida")) {
        const match = errorMessage.match(/Termo\(s\) detectado\(s\) sem pronúncia definida: ([^.]+)/);
        if (match) {
          const terms = match[1].split(', ').map(t => t.trim());
          setMissingPronunciations(terms);
          setShowPronunciationModal(true);
          setStep(hasUsedModification ? "editing-modified" : "editing");
          setLoading(false);
          toast.warning("Pronúncia necessária", {
            description: `Defina como pronunciar: ${terms.join(', ')}`
          });
          return;
        }
      }
      
      // Better error messages for users
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes("Limite de requisições")) {
        userFriendlyMessage = "Sistema ocupado. Tente novamente em 1 minuto.";
      } else if (errorMessage.includes("Créditos insuficientes")) {
        userFriendlyMessage = "Erro interno. Entre em contato com o suporte.";
      }
      
      toast.error("Erro ao aprovar letra", { 
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
      toast.error("Descreva as alterações desejadas");
      return;
    }

    if (hasUsedModification) {
      toast.error("Você já utilizou sua única modificação");
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
        throw new Error(data?.error || "Erro ao regenerar letra");
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
      setEditInstructions("");
      setStep("editing-modified");
      
      toast.success("Letra modificada gerada!", {
        description: "Você pode escolher entre a versão original ou a modificada"
      });

    } catch (error) {
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao regenerar", { description: errorMessage });
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
            message={step === "generating" ? "Criando suas letras..." : "Carregando..."}
            description={step === "generating" 
              ? "Nossa IA está criando 2 versões únicas baseadas na sua história. Isso pode levar alguns segundos."
              : "Preparando seu briefing..."
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
            <Badge className="mb-4">Etapa 1 de 2</Badge>
            <h1 className="text-3xl font-bold mb-2">Escolha Sua Letra</h1>
            <p className="text-muted-foreground">
              Geramos <strong>2 versões</strong> especiais da sua história. Qual você prefere?
            </p>
          </div>

          {/* Info Box - Importance of briefing */}
          <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-500 mb-1">💡 Dica Importante!</p>
                  <p className="text-muted-foreground">
                    Quanto mais detalhes você fornecer no briefing, melhor será a letra gerada! 
                    Nomes, datas, lugares e momentos especiais fazem toda a diferença.
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
                    <Badge variant="secondary">Versão {lyric.version}</Badge>
                  </div>
                  <CardDescription>Clique para selecionar e revisar</CardDescription>
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
              Voltar ao Briefing
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
            <Badge className="mb-4">Etapa 1 de 2 - Revisão</Badge>
            <h1 className="text-3xl font-bold mb-2">Revise Sua Letra</h1>
            <p className="text-muted-foreground">
              Aprove a letra ou solicite <strong>uma única modificação</strong> antes de produzir
            </p>
          </div>

          {/* Song Title */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Nome da Música
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Digite o nome da sua música..."
                className="text-lg font-semibold"
              />
            </CardContent>
          </Card>

          {/* Selected Lyric */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Letra</CardTitle>
                <Badge>Versão {selectedLyric?.version}</Badge>
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
                      <p className="font-semibold text-yellow-500 mb-1">⚠️ Atenção: Você pode modificar apenas UMA vez!</p>
                      <p className="text-muted-foreground">
                        Esta etapa é <strong>opcional</strong>. Se a letra já está do seu agrado, 
                        pode aprovar diretamente. Caso solicite modificação, você poderá escolher 
                        entre a versão original e a modificada.
                      </p>
                    </div>
                  </div>
                </div>
                
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Solicitar Modificação (opcional - apenas 1 vez)
                </h4>
                <Textarea
                  placeholder="Descreva as alterações que deseja... Ex: 'Trocar a palavra X por Y', 'Deixar o refrão mais alegre', 'Adicionar o nome Maria no verso 2'..."
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
                  <p className="font-semibold text-red-500 mb-1">Após aprovar a letra, não há devoluções</p>
                  <p className="text-muted-foreground">
                    Revise com atenção antes de confirmar. Depois de aprovada, a letra segue para produção 
                    e não poderá ser alterada ou reembolsada.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => setStep("select")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Escolher Outra Versão
            </Button>

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
                Modificar Letra (1x)
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
              Aprovar e Produzir Música
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
              Modificação usada ✓
            </Badge>
            <h1 className="text-3xl font-bold mb-2">Escolha a Versão Final</h1>
            <p className="text-muted-foreground">
              Compare a versão <strong>original</strong> com a <strong>modificada</strong> e escolha qual aprovar
            </p>
          </div>

          {/* Song Title */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Nome da Música
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Digite o nome da sua música..."
                className="text-lg font-semibold"
              />
            </CardContent>
          </Card>

          {/* Compare versions */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Original */}
            <Card 
              className={`cursor-pointer transition-all ${editedLyric === originalSelectedLyric?.body ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
              onClick={() => handleSelectModifiedOrOriginal(false)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Undo2 className="w-4 h-4" />
                    Versão Original
                  </CardTitle>
                  <Badge variant="outline">Versão {originalSelectedLyric?.version}</Badge>
                </div>
                <CardDescription>Sua escolha inicial</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {originalSelectedLyric?.body}
                  </pre>
                </div>
                {editedLyric === originalSelectedLyric?.body && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Selecionada</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modified */}
            <Card 
              className={`cursor-pointer transition-all ${editedLyric === modifiedLyric?.body ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
              onClick={() => handleSelectModifiedOrOriginal(true)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Versão Modificada
                  </CardTitle>
                  <Badge>Nova</Badge>
                </div>
                <CardDescription>Com suas alterações solicitadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {modifiedLyric?.body}
                  </pre>
                </div>
                {editedLyric === modifiedLyric?.body && (
                  <div className="mt-3 flex items-center gap-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Selecionada</span>
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
                  <p className="font-semibold text-red-500 mb-1">Após aprovar a letra, não há devoluções</p>
                  <p className="text-muted-foreground">
                    Esta é sua última chance de escolher. Depois de aprovada, a letra segue para produção 
                    e não poderá ser alterada ou reembolsada.
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
              Aprovar Versão Selecionada e Produzir
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
            message="Finalizando..."
            description="Preparando sua música para produção."
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
              ✓ Etapa 1 Concluída
            </Badge>
            <h1 className="text-3xl font-bold mb-2">Letra Aprovada!</h1>
            <p className="text-muted-foreground">
              Sua música está pronta para a Etapa 2: Produção Musical
            </p>
          </div>

          {/* Approved Lyric */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                {editedTitle}
              </CardTitle>
              <CardDescription>Letra aprovada</CardDescription>
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
                Próximos Passos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">✓</div>
                <span>Letra personalizada aprovada</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">✓</div>
                <span>Estilo musical configurado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">2</div>
                <span className="font-medium">Produção da música (em breve)</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ir para Dashboard
            </Button>
            <Button disabled className="bg-gradient-to-r from-primary to-purple-600">
              <Music className="w-4 h-4 mr-2" />
              Produzir Música (Em Breve)
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
