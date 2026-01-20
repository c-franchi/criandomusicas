import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    console.log('OpenAI Health Check - Starting...');
    console.log('API Key exists:', !!openAIApiKey);

    if (!openAIApiKey) {
      console.error('OpenAI API Key not found in environment variables');
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apikey option, like new OpenAI({apikey: "My API Key"})' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { story } = await req.json();
    console.log('Story received:', story ? 'Yes' : 'No');

    // Test simple OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant that responds with a simple confirmation message.' 
          },
          { 
            role: 'user', 
            content: story || 'Test connection to OpenAI API'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      }),
    });

    console.log('OpenAI API Response Status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `OpenAI API Error: ${response.status} - ${errorData}`,
        status: response.status,
        data: errorData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('OpenAI API Success - Response received');

    return new Response(JSON.stringify({ 
      ok: true, 
      text: `✅ Conexão OpenAI funcionando! Resposta: "${aiResponse}"`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in openai-health function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Error';
    return new Response(JSON.stringify({ 
      ok: false, 
      error: errorMessage,
      name: errorName
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});