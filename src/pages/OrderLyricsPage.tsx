import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection, doc, onSnapshot, orderBy, query, updateDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";

type LyricDoc = {
  id: string;
  version: "A" | "B" | "C";
  title: string;
  text: string;
  promptJson?: any;
  approvedAt?: any | null;
  createdAt?: any;
};

type OrderDoc = {
  userId?: string;
  occasion?: string;
  style: string;
  tone: string;
  durationTargetSec: number;
  storyRaw: string;
  status?: string;
  priceCents?: number;
  approvedLyricId?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

export default function OrderLyricsPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [lyrics, setLyrics] = useState<LyricDoc[]>([]);
  const [loadingGen, setLoadingGen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // carrega pedido e letras em tempo real
  useEffect(() => {
    if (!id) return;

    const unsubOrder = onSnapshot(doc(db, "orders", id), (snap) => {
      setOrder(snap.exists() ? (snap.data() as OrderDoc) : null);
    });

    const q = query(collection(db, `orders/${id}/lyrics`), orderBy("createdAt", "asc"));
    const unsubLyrics = onSnapshot(q, (snap) => {
      const arr: LyricDoc[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setLyrics(arr);
    });

    return () => {
      unsubOrder();
      unsubLyrics();
    };
  }, [id]);

  const canGenerate = useMemo(() => !!order && !!order.storyRaw && !!order.style && !!order.tone && !!order.durationTargetSec, [order]);

  const handleGenerate = useCallback(async () => {
    if (!id || !order) return;
    setLoadingGen(true);
    setError(null);
    try {
      const payload = {
        orderId: id,
        storyRaw: order.storyRaw,
        style: order.style,
        tone: order.tone,
        durationTargetSec: order.durationTargetSec || 120,
      };

      const r = await fetch("/api/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok || data?.ok !== true) {
        throw new Error(data?.error || data?.message || "Falha ao gerar letras");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoadingGen(false);
    }
  }, [id, order]);

  const handleApprove = useCallback(
    async (lyricId: string) => {
      if (!id) return;
      try {
        // salva no doc do pedido qual foi a aprovada
        await updateDoc(doc(db, "orders", id), {
          approvedLyricId: lyricId,
          status: "APPROVED",
          updatedAt: new Date(),
        });
        // opcional: grava approvedAt na subcoleção
        await updateDoc(doc(db, `orders/${id}/lyrics/${lyricId}`), {
          approvedAt: new Date(),
        });
        alert("Letra aprovada! (status atualizado para APPROVED)");
      } catch (e: any) {
        alert("Erro ao aprovar: " + (e?.message || String(e)));
      }
    },
    [id]
  );

  if (!id) return <div style={{ padding: 24 }}>Pedido não informado.</div>;
  if (!order) return <div style={{ padding: 24 }}>Carregando pedido...</div>;

  return (
    <div style={{ maxWidth: 980, margin: "32px auto", padding: 24 }}>
      <h1>Pedido #{id.slice(0, 8)} — Letras</h1>
      <div style={{ margin: "8px 0 16px", opacity: 0.8 }}>
        <div><b>Status:</b> {order.status || "—"}</div>
        <div><b>Estilo/Tom:</b> {order.style} / {order.tone} • <b>Duração alvo:</b> {order.durationTargetSec}s</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || loadingGen}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: loadingGen ? "#999" : "#0ea5e9",
            color: "white",
            border: "none",
            cursor: loadingGen ? "not-allowed" : "pointer",
          }}
        >
          {loadingGen ? "Gerando..." : "Gerar 2 letras"}
        </button>

        {error && <span style={{ color: "#ef4444" }}>Erro: {error}</span>}
      </div>

      {lyrics.length === 0 ? (
        <div style={{ padding: 16, border: "1px dashed #ccc", borderRadius: 12 }}>
          Nenhuma letra ainda. Clique em "Gerar 2 letras".
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {lyrics.map((l) => (
            <div key={l.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Versão {l.version}</strong>
                {order.approvedLyricId === l.id && <span style={{ color: "#10b981" }}>Aprovada</span>}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{l.title || "(sem título)"}</div>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{l.text}</pre>
              <button
                onClick={() => handleApprove(l.id)}
                disabled={order.approvedLyricId === l.id}
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: order.approvedLyricId === l.id ? "#9ca3af" : "#22c55e",
                  color: "white",
                  border: "none",
                  cursor: order.approvedLyricId === l.id ? "not-allowed" : "pointer",
                }}
              >
                {order.approvedLyricId === l.id ? "Já aprovada" : "Aprovar esta letra"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}