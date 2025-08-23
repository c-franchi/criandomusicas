import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "npm:openai";

const ok = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    ...init,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return ok({}, { status: 204 });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return ok({ ok: false, error: "OPENAI_API_KEY ausente" }, { status: 500 });

  const client = new OpenAI({ apiKey });

  try {
    const { story } = await req.json().catch(() => ({ story: "" }));
    const prompt = story?.trim() ? story : "Diga apenas: OK";

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8,
    });

    return ok({ ok: true, text: r.choices?.[0]?.message?.content ?? "" });
  } catch (e: any) {
    return ok(
      {
        ok: false,
        name: e?.name,
        message: e?.message,
        status: e?.status,
        data: e?.response?.data ?? String(e),
      },
      { status: 500 },
    );
  }
});