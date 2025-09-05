import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

type HealthOk = { ok: true; text: string };
type HealthErr = { ok: false; name?: string; message?: string; status?: number; data?: any; error?: string };

export default function TestOpenAI() {
  const navigate = useNavigate();
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<HealthOk | HealthErr | null>(null);

  async function handleTest() {
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch("/api/openai-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });
      const data = await r.json();
      setResp(data);
    } catch (e: any) {
      setResp({ ok: false, message: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  const ok = (resp as HealthOk)?.ok === true;
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-4">Teste de Conexão OpenAI</h1>
            <p className="text-muted-foreground">
              Teste a comunicação do front com a Cloud Function <code className="px-2 py-1 rounded bg-muted text-foreground">/api/openai-health</code>.
            </p>
          </div>
        </div>

        <div className="glass-card p-8 rounded-2xl border border-border/50 space-y-6">
          <div>
            <label htmlFor="story" className="block text-sm font-medium text-foreground mb-2">
              História de teste (opcional)
            </label>
            <textarea
              id="story"
              placeholder="Digite uma história para testar a OpenAI..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={5}
              className="w-full p-4 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={handleTest}
            disabled={loading}
            className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
              loading 
                ? "bg-muted text-muted-foreground cursor-not-allowed" 
                : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white music-glow"
            }`}
          >
            {loading ? "Testando conexão..." : "🔍 Testar Conexão OpenAI"}
          </button>

          {resp && (
            <div
              className={`p-6 rounded-xl border transition-all duration-300 ${
                ok 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${ok ? "bg-green-500" : "bg-destructive"}`}></div>
                <strong className="text-lg">
                  {ok ? "✅ Conexão Bem-sucedida" : "❌ Falha na Conexão"}
                </strong>
              </div>
              <pre className="text-sm opacity-80 whitespace-pre-wrap font-mono overflow-x-auto">
                {JSON.stringify(resp, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-muted-foreground text-sm">
            💡 Este teste verifica se as Firebase Functions estão funcionando corretamente
          </p>
        </div>
      </div>
    </div>
  );
}

