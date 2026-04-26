import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI Health Check - Starting...');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not found');
      return new Response(JSON.stringify({
        ok: false,
        error: 'LOVABLE_API_KEY ausente. Verifique a configuração do Lovable AI Gateway.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { story } = await req.json().catch(() => ({ story: null }));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.2',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de teste. Responda em uma frase curta confirmando que a conexão está funcionando.'
          },
          {
            role: 'user',
            content: story || 'Confirme se a conexão com o modelo está funcionando.'
          }
        ],
      }),
    });

    console.log('AI Gateway Response Status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI Gateway Error:', errorData);

      if (response.status === 429) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Limite de requisições excedido. Tente novamente em instantes.',
          status: 429,
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Créditos do Lovable AI esgotados. Adicione créditos em Settings > Workspace > Usage.',
          status: 402,
        }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        ok: false,
        error: `AI Gateway Error: ${response.status} - ${errorData}`,
        status: response.status,
        data: errorData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content ?? '(sem conteúdo)';

    return new Response(JSON.stringify({
      ok: true,
      model: 'openai/gpt-5.2',
      text: `✅ Conexão funcionando! Resposta: "${aiResponse}"`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in openai-health function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      ok: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
