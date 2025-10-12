import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import OpenAI from "openai";

admin.initializeApp();
const db = admin.firestore();

// Define the secret parameter
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Basic CORS headers for browser calls
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helpers
function splitTwoLyrics(text: string): { v1: string; v2: string } {
  // Try to split by explicit delimiter first
  const byDelimiter = text.split(/\n\s*---+\s*\n/);
  if (byDelimiter.length >= 2) {
    return { v1: byDelimiter[0].trim(), v2: byDelimiter[1].trim() };
  }
  // Fallback: split roughly in half on a paragraph boundary
  const paras = text.split(/\n{2,}/);
  const mid = Math.max(1, Math.floor(paras.length / 2));
  return { v1: paras.slice(0, mid).join("\n\n").trim(), v2: paras.slice(mid).join("\n\n").trim() };
}

function extractTitleAndBody(raw: string) {
  const lines = raw.split(/\r?\n/).map(l => l.trim());
  // Title = first non-empty line without section markers
  const titleIdx = lines.findIndex(l => l && !/^#|^\[|^\d+\./.test(l));
  const title = titleIdx >= 0 ? lines[titleIdx] : "Letra";
  const body = lines.filter((_, i) => i !== titleIdx).join("\n").trim();
  return { title: title.slice(0, 120), text: body };
}

export const openaiHealth = onRequest(
  { secrets: [openaiApiKey], cors: true },
  async (req, res) => {
    try {
      const story = (req.body?.story as string | undefined) || "Teste de conexão com a OpenAI";

      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        res.status(500).json({
          ok: false,
          error: "OPENAI_API_KEY não configurada. Execute: firebase functions:secrets:set OPENAI_API_KEY",
        });
        return;
      }

      const openai = new OpenAI({ apiKey });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um assistente útil e responde com uma confirmação simples." },
          { role: "user", content: story },
        ],
        max_tokens: 50,
        temperature: 0.7,
      });

      const aiResponse = completion.choices?.[0]?.message?.content || "Sem resposta";
      res.json({ ok: true, text: `✅ Conexão OpenAI funcionando! Resposta: "${aiResponse}"` });
    } catch (error: any) {
      console.error("openaiHealth error:", error?.response?.data || error);
      res.status(500).json({ ok: false, error: error?.message || String(error) });
    }
  }
);

export const generateLyrics = onRequest(
  { secrets: [openaiApiKey], cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Use POST" });
        return;
      }

      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        res.status(500).json({
          ok: false,
          error: "OPENAI_API_KEY não configurada. Execute: firebase functions:secrets:set OPENAI_API_KEY",
        });
        return;
      }

      const { orderId, storyRaw, style, tone, durationTargetSec } = req.body || {};

      if (!orderId || !storyRaw) {
        res.status(400).json({ ok: false, error: "Campos obrigatórios: orderId e storyRaw" });
        return;
      }

      const target = Number(durationTargetSec) || 120;

      const openai = new OpenAI({ apiKey });

      const system = [
        "Você é um letrista profissional.",
        "NUNCA copie as instruções do usuário na resposta.",
        "Entregue SOMENTE a letra final, com estrofes e refrões claros.",
        "Evite clichês e rimas pobres; mantenha a métrica coerente para ~" + target + "s.",
      ].join("\n");

      const userPrompt = [
        `Escreva DUAS variações de letra completas para uma música.`,
        `Gênero/Estilo: ${style || "Pop"}. Tom: ${tone || "Emocionante"}.`,
        `História/Briefing (baseie-se fielmente nisso):`,
        storyRaw,
        `Separe as duas versões com uma linha:`,
        `---`,
        `Não inclua comentários, apenas as letras.`,
      ].join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.9,
      });

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) {
        res.status(500).json({ ok: false, error: "Resposta vazia da OpenAI" });
        return;
      }

      const { v1, v2 } = splitTwoLyrics(content);
      const l1 = extractTitleAndBody(v1);
      const l2 = extractTitleAndBody(v2);

      // Persist in Firestore: orders/{orderId}/lyrics
      const baseRef = db.collection("orders").doc(orderId).collection("lyrics");
      const now = admin.firestore.FieldValue.serverTimestamp();

      const batch = db.batch();
      const ref1 = baseRef.doc();
      batch.set(ref1, {
        version: 1,
        title: l1.title,
        text: l1.text,
        createdAt: now,
        approved: false,
      });
      const ref2 = baseRef.doc();
      batch.set(ref2, {
        version: 2,
        title: l2.title,
        text: l2.text,
        createdAt: now,
        approved: false,
      });

      // Optionally: update order status lightly if document exists
      const orderRef = db.collection("orders").doc(orderId);
      batch.set(orderRef, { updatedAt: now }, { merge: true });

      await batch.commit();

      res.json({ ok: true, message: "Letras geradas e salvas", ids: [ref1.id, ref2.id] });
    } catch (error: any) {
      console.error("generateLyrics error:", error?.response?.data || error);
      const status = error?.status || 500;
      res.status(status).json({ ok: false, error: error?.message || String(error) });
    }
  }
);
