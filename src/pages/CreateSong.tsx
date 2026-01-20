import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Sparkles, ArrowRight, Loader2, ArrowLeft, CheckCircle, Edit3, RefreshCw, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

type Step = "loading" | "generating" | "select" | "editing" | "approved" | "complete";

const CreateSong = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("loading");
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricOption[]>([]);
  const [selectedLyric, setSelectedLyric] = useState<LyricOption | null>(null);
  const [editedLyric, setEditedLyric] = useState<string>("");
  const [editedTitle, setEditedTitle] = useState<string>("");
  const [editInstructions, setEditInstructions] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Carregar dados do briefing
  useEffect(() => {
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
  }, []);

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
        version: String.fromCharCode(65 + idx), // A, B, C...
        title: l.title || `Versão ${String.fromCharCode(65 + idx)}`,
        body: l.text || l.body || ""
      }));

      setLyrics(generatedLyrics);
      setStep("select");
      toast.success("Letras geradas com sucesso!", {
        description: "Escolha a versão que mais combina com você"
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
    setEditedLyric(lyric.body);
    setEditedTitle(lyric.title);
    setStep("editing");
  };

  const handleApproveLyric = async () => {
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
        throw new Error(data?.error || "Erro ao gerar prompt de estilo");
      }

      setStep("complete");

      toast.success("🎵 Letra aprovada!", {
        description: "Sua música está pronta para produção!"
      });

    } catch (error) {
      console.error("Erro:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao aprovar letra", { description: errorMessage });
      setStep("editing");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!orderId || !briefingData || !editInstructions.trim()) {
      toast.error("Descreva as alterações desejadas");
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
          }
        }
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.error || "Erro ao regenerar letras");
      }

      const generatedLyrics: LyricOption[] = data.lyrics.map((l: any, idx: number) => ({
        id: l.id || `lyric-${idx}`,
        version: String.fromCharCode(65 + idx),
        title: l.title || `Versão ${String.fromCharCode(65 + idx)}`,
        body: l.text || l.body || ""
      }));

      setLyrics(generatedLyrics);
      setEditInstructions("");
      setStep("select");
      toast.success("Novas versões geradas!", {
        description: "Escolha a versão que mais combina com você"
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
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {step === "generating" ? "Criando suas letras..." : "Carregando..."}
          </h2>
          <p className="text-muted-foreground">
            {step === "generating" 
              ? "Nossa IA está criando versões únicas baseadas na sua história. Isso pode levar alguns segundos."
              : "Preparando seu briefing..."
            }
          </p>
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
              Geramos duas versões especiais da sua história. Qual você prefere?
            </p>
          </div>

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

  // Step 2: Edit/Approve lyrics
  if (step === "editing") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge className="mb-4">Etapa 1 de 2 - Revisão</Badge>
            <h1 className="text-3xl font-bold mb-2">Revise Sua Letra</h1>
            <p className="text-muted-foreground">
              Aprove a letra ou solicite ajustes antes de produzir a música
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
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Solicitar Ajustes (opcional)
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
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerar com Ajustes
              </Button>
            )}

            <Button
              onClick={handleApproveLyric}
              disabled={loading || !editedTitle.trim()}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Aprovar e Produzir Música
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            ⚠️ Após aprovar, a letra não poderá ser alterada durante a produção da música.
          </p>
        </div>
      </div>
    );
  }

  // Approved state
  if (step === "approved") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Finalizando...</h2>
          <p className="text-muted-foreground">
            Preparando sua música para produção.
          </p>
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

  return null;
};

export default CreateSong;
