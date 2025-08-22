import "https://deno.land/x/xhr@0.1.0/mod.ts";

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICallOptions {
  model?: string;
  messages: OpenAIMessage[];
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface OpenAIResponse {
  ok: boolean;
  content?: string;
  error?: string;
  usage?: any;
}

export async function callOpenAI(options: OpenAICallOptions): Promise<OpenAIResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('OPENAI_API_KEY not found in environment');
    return { ok: false, error: 'OpenAI API key not configured' };
  }

  const model = options.model || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
  const timeout = options.timeout || 30000;

  console.log(`OpenAI call: model=${model}, messages=${options.messages.length}, temperature=${options.temperature}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestBody = {
      model,
      messages: options.messages,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.maxTokens && { max_tokens: options.maxTokens })
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorData);
      return { 
        ok: false, 
        error: `OpenAI API error: ${response.status} ${response.statusText}` 
      };
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response format:', JSON.stringify(data));
      return { ok: false, error: 'Invalid response format from OpenAI' };
    }

    console.log(`OpenAI success: ${data.usage?.total_tokens || 0} tokens used`);
    
    return {
      ok: true,
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('OpenAI request timeout');
      return { ok: false, error: 'Request timeout' };
    }
    
    console.error('OpenAI request failed:', error);
    return { ok: false, error: `Request failed: ${error.message}` };
  }
}