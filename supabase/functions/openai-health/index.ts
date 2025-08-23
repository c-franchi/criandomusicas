import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI } from "../_shared/openai-helper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== OpenAI Health Check Started ===");

    // Check required environment variables
    const envVars = {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY'),
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    };

    console.log(`Environment check: ${Object.entries(envVars).map(([k, v]) => `${k}: ${v ? 'FOUND' : 'MISSING'}`).join(', ')}`);

    const missing = Object.entries(envVars).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      console.error(error);
      return new Response(JSON.stringify({ 
        ok: false, 
        error,
        timestamp: new Date().toISOString(),
        missing_vars: missing
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { story = "Diga apenas: OK" } = await req.json().catch(() => ({}));
    console.log(`Testing with message: "${story.substring(0, 50)}${story.length > 50 ? '...' : ''}"`);

    // Test OpenAI connection
    const response = await callOpenAI({
      messages: [
        { role: 'system', content: 'Você é um assistente útil. Responda de forma concisa e amigável.' },
        { role: 'user', content: story }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 150,
      timeoutMs: 30000
    });

    if (!response.ok) {
      console.error(`OpenAI test failed: ${response.error}`);
      return new Response(JSON.stringify({
        ok: false,
        error: response.error,
        timestamp: new Date().toISOString(),
        test_message: story
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`OpenAI test successful! Response length: ${response.content?.length || 0} chars`);

    return new Response(JSON.stringify({
      ok: true,
      content: response.content,
      timestamp: new Date().toISOString(),
      test_message: story,
      usage: response.usage,
      model: 'gpt-4o-mini'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in openai-health function:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      name: error.name,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});