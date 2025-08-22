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
  timeoutMs?: number;
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
  const timeoutMs = options.timeoutMs ?? 30000;

  console.log(`OpenAI call: model=${model}, messages=${options.messages.length}, temperature=${options.temperature}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const commonHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1) Tenta Chat Completions primeiro
    const completionsBody = {
      model,
      messages: options.messages,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    };

    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(completionsBody),
      signal: controller.signal,
    });

    if (response.ok) {
      clearTimeout(timer);
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      console.log(`OpenAI (chat) success: ${data?.usage?.total_tokens ?? '?'} tokens used`);
      return { ok: true, content: text, usage: data?.usage };
    }

    // Log do erro da Chat Completions
    const rawError = await response.text();
    console.warn(`OpenAI chat completions failed: ${response.status} ${response.statusText} • ${rawError}`);

    // 2) Fallback para Responses API se Chat Completions falhar
    console.log('Attempting fallback to Responses API...');
    const responsesBody = {
      model,
      input: options.messages.map(m => ({ role: m.role, content: m.content })),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxTokens ? { max_output_tokens: options.maxTokens } : {}),
    };

    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify(responsesBody),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const fallbackError = await response.text();
      console.error(`OpenAI responses API also failed: ${response.status} ${response.statusText} • ${fallbackError}`);
      return { ok: false, error: `OpenAI error: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();
    // Responses API pode expor texto em output_text
    const text = Array.isArray(data?.output_text) 
      ? data.output_text.join('\n') 
      : (data?.output_text ?? '');
    
    console.log(`OpenAI (responses) success: fallback worked`);
    return { ok: true, content: text, usage: data?.usage };

  } catch (error: any) {
    clearTimeout(timer);
    if (error?.name === 'AbortError') {
      console.error('OpenAI request timeout');
      return { ok: false, error: 'Request timeout' };
    }
    
    console.error('OpenAI request failed:', error);
    return { ok: false, error: `Request failed: ${error?.message ?? 'unknown error'}` };
  }
}