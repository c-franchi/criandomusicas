import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[transcribe-audio] No auth header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user with getUser
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      console.error('[transcribe-audio] Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;
    console.log('[transcribe-audio] User:', userId);

    // Service role client for storage/db operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { audio_id, language = 'pt' } = await req.json();

    if (!audio_id) {
      return new Response(JSON.stringify({ error: 'audio_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[transcribe-audio] Audio ID:', audio_id, '| Language:', language);

    // 1. Fetch audio_input record
    const { data: audioInput, error: audioError } = await supabase
      .from('audio_inputs')
      .select('*')
      .eq('id', audio_id)
      .eq('user_id', userId)
      .single();

    if (audioError || !audioInput) {
      console.error('[transcribe-audio] Audio not found:', audioError);
      return new Response(JSON.stringify({ error: 'Audio not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[transcribe-audio] Audio found:', audioInput.storage_path, '| MIME:', audioInput.mime_type);

    // 2. Download audio from storage
    const { data: audioFile, error: downloadError } = await supabase.storage
      .from('audio-inputs')
      .download(audioInput.storage_path);

    if (downloadError || !audioFile) {
      console.error('[transcribe-audio] Download error:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download audio file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[transcribe-audio] Audio downloaded, size:', audioFile.size);

    // 3. Call OpenAI Whisper API for transcription
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[transcribe-audio] OPENAI_API_KEY not found');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const extMap: Record<string, string> = {
      'audio/wav': 'wav', 'audio/x-wav': 'wav',
      'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
      'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a',
      'audio/webm': 'webm', 'audio/webm;codecs=opus': 'webm',
      'audio/ogg': 'ogg',
    };
    const ext = extMap[audioInput.mime_type] || 'wav';

    const formData = new FormData();
    formData.append('file', new File([audioFile], `audio.${ext}`, { type: audioInput.mime_type }));
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');
    formData.append('prompt', 'Trecho cantado de música em português brasileiro. Transcrever as palavras cantadas fielmente.');

    console.log('[transcribe-audio] Calling OpenAI Whisper API...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[transcribe-audio] Whisper error:', whisperResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Transcription failed', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const whisperData = await whisperResponse.json();
    console.log('[transcribe-audio] Transcription received, length:', whisperData.text?.length);

    const transcriptText = whisperData.text?.trim();

    if (!transcriptText) {
      return new Response(JSON.stringify({
        error: 'Empty transcription',
        message: 'Não foi possível identificar palavras no áudio. Tente gravar um áudio mais claro.',
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const segments = whisperData.segments?.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text?.trim(),
    })) || null;

    // 4. Detect voice gender using GPT (analyze audio characteristics from transcription context)
    let detectedVoiceType = 'feminina'; // default
    try {
      console.log('[transcribe-audio] Detecting voice gender via GPT...');
      const genderDetectResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em análise vocal. Dado um áudio transcrito e metadados do Whisper, determine se a voz que cantou/falou é masculina ou feminina. Responda APENAS com uma palavra: "masculina" ou "feminina". Se não tiver certeza, responda "feminina".',
            },
            {
              role: 'user',
              content: `Analise este trecho cantado/falado e determine o gênero da voz:\n\nTranscrição: "${transcriptText}"\n\nDuração do áudio: ${whisperData.duration || audioInput.duration_sec || 'desconhecida'}s\nIdioma detectado: ${whisperData.language || language}\n\nBaseado no contexto linguístico (pronomes, adjetivos, concordância de gênero no texto cantado), determine se a voz é masculina ou feminina.`,
            },
          ],
          max_tokens: 10,
          temperature: 0,
        }),
      });

      if (genderDetectResponse.ok) {
        const genderData = await genderDetectResponse.json();
        const genderResult = genderData.choices?.[0]?.message?.content?.trim()?.toLowerCase();
        if (genderResult?.includes('masculin')) {
          detectedVoiceType = 'masculina';
        } else {
          detectedVoiceType = 'feminina';
        }
        console.log('[transcribe-audio] Detected voice type:', detectedVoiceType);
      } else {
        console.warn('[transcribe-audio] Gender detection failed, using default');
      }
    } catch (genderError) {
      console.warn('[transcribe-audio] Gender detection error:', genderError);
      // Continue with default
    }

    // 5. Save transcription to database
    const { data: transcription, error: insertError } = await supabase
      .from('transcriptions')
      .insert({
        audio_id,
        user_id: userId,
        transcript_text: transcriptText,
        segments_json: segments,
        model: 'whisper-1',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[transcribe-audio] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save transcription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[transcribe-audio] Transcription saved:', transcription.id);

    return new Response(JSON.stringify({
      ok: true,
      audio_id,
      transcription_id: transcription.id,
      transcript: transcriptText,
      segments,
      model: 'whisper-1',
      duration_sec: whisperData.duration || audioInput.duration_sec,
      detected_voice_type: detectedVoiceType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[transcribe-audio] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
