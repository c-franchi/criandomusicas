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
    <div style={{ maxWidth: 780, margin: "40px auto", padding: 24 }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 16,
          padding: "8px 16px",
          borderRadius: 8,
          background: "#6b7280",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        ← Voltar
      </button>
      
      <h1 style={{ marginBottom: 8 }}>Teste de conexão OpenAI</h1>
      <p style={{ marginBottom: 16, opacity: 0.8 }}>
        Teste a comunicação do front com a Cloud Function <code>/api/openai-health</code>.
      </p>

      <textarea
        placeholder="História de teste (opcional)"
        value={story}
        onChange={(e) => setStory(e.target.value)}
        rows={5}
        style={{ width: "100%", padding: 12, borderRadius: 8, marginBottom: 12 }}
      />

      <button
        onClick={handleTest}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          background: loading ? "#999" : "#7c3aed",
          color: "white",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Testando..." : "Testar conexão OpenAI"}
      </button>

      {resp && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            background: ok ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.12)",
            border: `1px solid ${ok ? "rgb(16,185,129)" : "rgb(239,68,68)"}`,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <strong>{ok ? "✅ Sucesso" : "❌ Falha"}</strong>
          <div style={{ marginTop: 8 }}>
            <code>{JSON.stringify(resp, null, 2)}</code>
          </div>
        </div>
      )}
    </div>
  );
}

