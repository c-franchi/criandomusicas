import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TestOpenAI = () => {
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const testMessage = story.trim() || "Diga apenas: OK";
      
      const { data, error: functionError } = await supabase.functions.invoke('openai-health', {
        body: { story: testMessage }
      });

      if (functionError) {
        setError(`Erro na função: ${functionError.message}`);
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(`Erro de rede: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result && !error) return null;

    const isSuccess = result?.ok === true;
    const bgColor = isSuccess ? "bg-green-950/20 border-green-500/30" : "bg-red-950/20 border-red-500/30";
    const iconColor = isSuccess ? "text-green-400" : "text-red-400";
    const Icon = isSuccess ? CheckCircle : XCircle;

    return (
      <Card className={`mt-6 ${bgColor}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            {isSuccess ? "Conexão bem-sucedida" : "Falha na conexão"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="space-y-2">
              <p className="text-red-400 font-medium">Erro:</p>
              <pre className="bg-muted/50 p-3 rounded-md text-sm overflow-auto">
                {error}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              {isSuccess && result.content && (
                <div>
                  <p className="text-green-400 font-medium mb-2">Resposta da IA:</p>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-foreground">{result.content}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-sm mb-2">Resposta completa (JSON):</p>
                <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="glass-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl gradient-text">
              Teste de conexão OpenAI
            </CardTitle>
            <p className="text-muted-foreground">
              Teste a comunicação com a API OpenAI através da Edge Function
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="story" className="text-sm font-medium text-foreground">
                História de teste (opcional)
              </label>
              <Textarea
                id="story"
                placeholder="Se vazio, enviará apenas 'Diga apenas: OK' para testar a conexão básica..."
                value={story}
                onChange={(e) => setStory(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            <Button 
              onClick={testConnection} 
              disabled={loading}
              className="w-full"
              variant="hero"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando conexão...
                </>
              ) : (
                "Testar conexão OpenAI"
              )}
            </Button>

            {loading && (
              <div className="flex justify-center">
                <Badge variant="secondary" className="animate-pulse">
                  Aguardando resposta da OpenAI...
                </Badge>
              </div>
            )}

            {renderResult()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestOpenAI;