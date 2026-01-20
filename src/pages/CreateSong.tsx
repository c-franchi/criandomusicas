import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Sparkles, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface LyricOption {
  id: string;
  version: string;
  title: string;
  text: string;
}

const CreateSong = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState<LyricOption[]>([]);
  const [selectedLyric, setSelectedLyric] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "select" | "confirm">("input");
  const [usedModel, setUsedModel] = useState<string>("");
  const [briefingData, setBriefingData] = useState<any>(null);
  const promptSamples = [
    {
      id: 'romantic-serta',
      title: 'Pedido Romântico (Sertanejo)',
      text: 'Quero uma música sertaneja romântica para expressar meu amor pela [Nome], contando sobre como nos conhecemos em [lugar] e nossos planos para [futuro]. Tom emocionante, refrão marcante.'
    },
    {
      id: 'wedding-pop',
      title: 'Casamento (Pop)',
      text: 'Música pop para casamento, celebrando nossa história desde [momento especial], citando amigos/família [nomes], tom inspirador e alegre, refrão para cantar junto.'
    },
    {
      id: 'tribute-mom',
      title: 'Homenagem para Mãe',
      text: 'Letra emocionante para homenagear minha mãe [nome], falando de sua força, conselhos, e gratidão por [momentos]. Tom nostálgico e carinhoso.'
    }
  ];

  // Carregar dados do briefing
  useEffect(() => {
    const data = localStorage.getItem('briefingData');
    if (data) {
      const parsed = JSON.parse(data);
      setBriefingData(parsed);
      setStory(parsed.storyRaw || "");
      localStorage.removeItem('briefingData'); // Limpar após usar
    }
    // Se veio direto sem briefing, mande para o briefing primeiro
    if (!data) {
      navigate('/briefing');
    }
  }, []);

  // Sanitização defensiva
  const sanitizeLyric = (text: string) => {
    const banned = /(crie uma letra|escreva|faça uma letra|prompt|instrução)/i;
    return text
      .split(/\r?\n/)
      .filter(l => !banned.test(l))
      .join("\n")
      .trim();
  };

  const handleGenerateLyrics = async () => {
    if (!story.trim() || !user || !briefingData) return;

    setLoading(true);
    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch("https://us-central1-sua-musica-8da85.cloudfunctions.net/generateLyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          plan: briefingData.plan,
          orderId,
          occasion: briefingData.occasion,
          style: briefingData.style,
          tone: briefingData.tone,
          storyRaw: story
        }),
      });

      const data = await response.json();

      if (response.status === 403 && data.code === "FREE_LIMIT_REACHED") {
        toast.error("Limite do plano free atingido", {
          description: data.message,
        });
        navigate("/planos");
        return;
      }

      if (data.ok) {
        // Aplicar sanitização defensiva às letras recebidas
        const sanitizedLyrics: LyricOption[] = [
          {
            id: "lyric-a",
            version: "A",
            title: "Versão A",
            text: sanitizeLyric(data.lyrics?.[0]?.text || "Letra não disponível"),
          },
          {
            id: "lyric-b",
            version: "B",
            title: "Versão B",
            text: sanitizeLyric(data.lyrics?.[1]?.text || "Letra não disponível"),
          },
        ];

        setLyrics(sanitizedLyrics);
        setUsedModel(data.usedModel || "gpt-4o");
        setStep("select");
        toast.success("Letras geradas com sucesso!", {
          description: "Escolha a versão que mais combina com você",
        });
      } else {
        toast.error(data.message || "Erro ao gerar letras", {
          description: "Tente novamente ou entre em contato com o suporte",
        });
      }
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao conectar com o servidor", {
        description: "Verifique sua conexão e tente novamente",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLyric = (lyricId: string) => {
    setSelectedLyric(lyricId);
    setStep("confirm");
  };

  const handleConfirmSelection = () => {
    // Aqui seria implementada a lógica para prosseguir com a música
    toast.success("🎵 Música selecionada!", {
      description: "Em breve você receberá sua música personalizada por WhatsApp.",
      duration: 5000,
    });
    // Reset para nova criação
    setStep("input");
    setStory("");
    setLyrics([]);
    setSelectedLyric(null);
  };

  if (step === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Escolha Sua Música
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Selecionamos duas versões especiais da sua história. Qual você prefere?
            </p>
            {usedModel && (
              <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                <span>Gerado com: <strong>{usedModel}</strong></span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {lyrics.map((lyric) => (
              <Card
                key={lyric.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedLyric === lyric.id
                    ? "ring-2 ring-purple-500 shadow-lg"
                    : "hover:shadow-md"
                }`}
                onClick={() => handleSelectLyric(lyric.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-purple-700">
                      {lyric.title}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      Versão {lyric.version}
                    </Badge>
                  </div>
                  <CardDescription>
                    Clique para selecionar esta versão
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {lyric.text}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setStep("input")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    const selectedLyricData = lyrics.find(l => l.id === selectedLyric);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              Música Selecionada!
            </CardTitle>
            <CardDescription className="text-lg">
              Você escolheu: <strong>{selectedLyricData?.title}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {selectedLyricData?.text}
              </pre>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                🎵 Sua música personalizada está sendo criada!
                <br />
                Em breve você receberá por WhatsApp.
              </p>
              <Button
                onClick={handleConfirmSelection}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Confirmar e Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-purple-600" />
          </div>
          <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Criar Música
          </CardTitle>
          <CardDescription className="text-lg">
            Transforme sua história em uma música inesquecível
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {briefingData && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-foreground">Seu Briefing:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Ocasião:</strong> {briefingData.occasion}</p>
                <p><strong>Plano:</strong> {briefingData.plan.toUpperCase()}</p>
                {briefingData.plan !== 'free' && (
                  <>
                    <p><strong>Estilo:</strong> {briefingData.style}</p>
                    <p><strong>Tom:</strong> {briefingData.tone}</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-2">Modelos de pedido</h4>
            <Accordion type="single" collapsible>
              {promptSamples.map((p) => (
                <AccordionItem key={p.id} value={p.id}>
                  <AccordionTrigger>{p.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-white rounded-md p-3 text-sm text-gray-700">
                      <div className="whitespace-pre-wrap">{p.text}</div>
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => setStory(p.text)}>Copiar para o campo</Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conte sua história ou descreva a música que você quer:
            </label>
            <Textarea
              placeholder="Conte qualquer história, homenagem, brincadeira ou momento especial que você quer transformar em música. Seja criativo!"
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={6}
              className="w-full resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Histórias de amor, homenagens, brincadeiras, conquistas... Tudo vira música! Quanto mais detalhes você fornecer, melhor será sua música.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/briefing')}
              className="flex-1"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar ao Briefing
            </Button>
            <Button
              onClick={handleGenerateLyrics}
              disabled={loading || !story.trim()}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando letras...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>💡 Dica: Histórias com emoção geram músicas mais especiais!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSong;
