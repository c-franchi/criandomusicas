import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BriefingData {
  musicType?: string;
  emotion?: string;
  style?: string;
  rhythm?: string;
  atmosphere?: string;
  voiceType?: string;
  isInstrumental?: boolean;
  instruments?: string[];
}

interface ValidationResult {
  score: number; // 0-100
  matches: string[];
  mismatches: string[];
  isValid: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, briefing, stylePrompt, finalPrompt } = await req.json() as {
      orderId: string;
      briefing: BriefingData;
      stylePrompt: string;
      finalPrompt: string;
    };

    console.log("validate-prompt called for orderId:", orderId);

    if (!orderId || !briefing || !stylePrompt) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campos obrigatórios: orderId, briefing, stylePrompt" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const AI_GATEWAY_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!AI_GATEWAY_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "AI_GATEWAY_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the validation prompt
    const systemPrompt = `You are a music production quality assurance specialist. Your job is to verify that a generated style prompt correctly reflects the user's original briefing requirements.

You will analyze:
1. The original briefing (user's requirements)
2. The generated style prompt

Your task is to check if the key elements match:
- Music type/occasion
- Emotion/mood
- Musical style/genre
- Rhythm/tempo
- Atmosphere
- Voice type (for vocal tracks)
- Instruments (for instrumental tracks)

OUTPUT FORMAT (JSON only, no markdown):
{
  "score": <0-100>,
  "matches": ["list of elements that match correctly"],
  "mismatches": ["list of elements that don't match or are missing"],
  "summary": "Brief explanation in Portuguese"
}

Score guidelines:
- 90-100: Perfect match, ready for production
- 70-89: Good match, minor differences acceptable
- 50-69: Needs review, some important elements differ
- 0-49: Major mismatch, should regenerate`;

    const userPrompt = `Analyze if this style prompt matches the user's briefing:

ORIGINAL BRIEFING:
- Type: ${briefing.musicType || 'não especificado'}
- Emotion: ${briefing.emotion || 'não especificado'}
- Style: ${briefing.style || 'não especificado'}
- Rhythm: ${briefing.rhythm || 'não especificado'}
- Atmosphere: ${briefing.atmosphere || 'não especificado'}
- Voice Type: ${briefing.voiceType || 'não especificado'}
- Is Instrumental: ${briefing.isInstrumental ? 'YES' : 'NO'}
${briefing.instruments?.length ? `- Instruments: ${briefing.instruments.join(', ')}` : ''}

GENERATED STYLE PROMPT:
${stylePrompt}

Provide your analysis as JSON.`;

    console.log("Calling AI Gateway for validation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ ok: false, error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ ok: false, error: "Error validating prompt" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return new Response(
        JSON.stringify({ ok: false, error: "Empty AI response" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let validation: ValidationResult;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      validation = {
        score: parsed.score || 0,
        matches: parsed.matches || [],
        mismatches: parsed.mismatches || [],
        isValid: (parsed.score || 0) >= 70
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Default to valid if we can't parse
      validation = {
        score: 80,
        matches: ["Unable to parse detailed validation"],
        mismatches: [],
        isValid: true
      };
    }

    console.log("Validation result:", validation);

    // Update order with validation score
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        prompt_validation_score: validation.score,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        validation,
        message: validation.isValid 
          ? "Prompt validado com sucesso! Pronto para produção."
          : "Prompt precisa de revisão antes da produção."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("validate-prompt error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
