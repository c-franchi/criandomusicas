import { supabase } from "@/integrations/supabase/client";
import { MusicCreationService } from "./MusicCreationService";
import { resolveGenerationLanguage } from "../../supabase/functions/_shared/generationLanguage";

/**
 * OrderProcessingService
 * Centraliza a lógica de processamento de pedidos após o consumo de créditos.
 * Garante que cada etapa (crédito → status → geração de letras) seja executada
 * de forma confiável com retry, timeout e tratamento de erros.
 */

export interface BriefingPayload {
  isInstrumental: boolean;
  hasCustomLyric?: boolean;
  story?: string;
  musicType?: string;
  emotion?: string;
  emotionIntensity?: number;
  style?: string;
  customStyle?: string;
  rhythm?: string;
  atmosphere?: string;
  voiceType?: string;
  hasMonologue?: boolean;
  monologuePosition?: string;
  mandatoryWords?: string;
  restrictedWords?: string;
  structure?: string[];
  songName?: string;
  autoGenerateName?: boolean;
  instruments?: string[];
  soloInstrument?: string;
  soloMoment?: string;
  instrumentationNotes?: string;
  hasCustomStylePrompt?: boolean;
  customStylePrompt?: string;
  // Motivational
  motivationalNarrative?: string;
  motivationalMoment?: string;
  motivationalIntensity?: string;
  motivationalPerspective?: string;
  // Cover
  customCoverUrl?: string;
  coverMode?: string;
  // Any other dynamic fields
  [key: string]: unknown;
}

export interface ProcessingResult {
  success: boolean;
  action: 'dashboard' | 'create-song' | 'error';
  orderId: string;
  message?: string;
  error?: string;
}

const LYRICS_TIMEOUT_MS = 120_000; // 2 minutes
const MAX_RETRIES = 1;

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified time, the returned promise rejects with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label} demorou mais de ${Math.round(ms / 1000)}s`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class OrderProcessingService {
  /**
   * Process an order after credit has been consumed.
   * Handles instrumental, quick mode, and detailed mode flows.
   */
  static async processAfterCredit(
    orderId: string,
    briefing: BriefingPayload,
    options: {
      isQuickMode: boolean;
      audioInsert?: { section: string; mode: string; transcript: string } | null;
    }
  ): Promise<ProcessingResult> {
    const { isQuickMode, audioInsert } = options;

    try {
      // ── INSTRUMENTAL ──
      if (briefing.isInstrumental) {
        return await this.processInstrumental(orderId, briefing);
      }

      // ── CUSTOM LYRIC (letra própria) ──
      // Não precisa gerar letras — vai direto para aprovação via CreateSong
      if (briefing.hasCustomLyric) {
        return await this.processCustomLyric(orderId, briefing);
      }

      // ── QUICK MODE (fire-and-forget com status seguro) ──
      if (isQuickMode) {
        return await this.processQuickMode(orderId, briefing);
      }

      // ── DETAILED MODE (espera letras) ──
      return await this.processDetailedMode(orderId, briefing, audioInsert);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[OrderService] Unexpected error:', msg);

      // Marcar pedido como recuperável
      await this.markOrderRecoverable(orderId).catch(() => {});

      return {
        success: false,
        action: 'dashboard',
        orderId,
        error: msg,
        message: 'Ocorreu um erro. Você pode tentar novamente pelo dashboard.',
      };
    }
  }

  // ─────────── CUSTOM LYRIC (letra própria) ───────────
  private static async processCustomLyric(
    orderId: string,
    briefing: BriefingPayload
  ): Promise<ProcessingResult> {
    console.log('[OrderService] Processing custom lyric order:', orderId);

    // Atualizar status para PAID (o CreateSong vai lidar com a aprovação)
    await supabase
      .from('orders')
      .update({
        status: 'PAID',
        payment_status: 'PAID',
      })
      .eq('id', orderId);

    // Redirecionar para CreateSong onde o usuário pode revisar e aprovar sua letra
    return {
      success: true,
      action: 'create-song',
      orderId,
      message: '📝 Revise e aprove sua letra!',
    };
  }

  // ─────────── INSTRUMENTAL ───────────
  private static async processInstrumental(
    orderId: string,
    briefing: BriefingPayload
  ): Promise<ProcessingResult> {
    console.log('[OrderService] Processing instrumental order:', orderId);

    const { error } = await supabase.functions.invoke('generate-style-prompt', {
      body: {
        orderId,
        isInstrumental: true,
        songTitle: briefing.songName || null,
        customCoverUrl: briefing.customCoverUrl || null,
        coverMode: briefing.coverMode || 'auto',
        language: resolveGenerationLanguage(briefing.language, MusicCreationService.getActiveLanguage()),
        briefing: {
          ...briefing,
          instruments: briefing.instruments || [],
          soloInstrument: briefing.soloInstrument || null,
          soloMoment: briefing.soloMoment || null,
          instrumentationNotes: briefing.instrumentationNotes || '',
        },
      },
    });

    if (error) {
      console.error('[OrderService] Style prompt error:', error);
    }

    return {
      success: true,
      action: 'dashboard',
      orderId,
      message: '🎹 Música instrumental em produção!',
    };
  }

  // ─────────── QUICK MODE ───────────
  private static async processQuickMode(
    orderId: string,
    briefing: BriefingPayload
  ): Promise<ProcessingResult> {
    console.log('[OrderService] Processing quick mode order:', orderId);

    // CRÍTICO: Atualizar status ANTES de disparar geração
    const { error: statusError } = await supabase
      .from('orders')
      .update({
        status: 'LYRICS_PENDING',
        payment_status: 'PAID',
      })
      .eq('id', orderId);

    if (statusError) {
      console.error('[OrderService] Status update error:', statusError);
      // Mesmo com erro de status, tentar gerar letras
    }

    // Fire-and-forget com logging robusto
    this.generateLyricsBackground(orderId, briefing).catch((err) => {
      console.error('[OrderService] Background lyrics generation failed:', err);
    });

    return {
      success: true,
      action: 'dashboard',
      orderId,
      message: '🎵 Pedido enviado! Acompanhe no dashboard.',
    };
  }

  // ─────────── DETAILED MODE ───────────
  private static async processDetailedMode(
    orderId: string,
    briefing: BriefingPayload,
    audioInsert?: { section: string; mode: string; transcript: string } | null
  ): Promise<ProcessingResult> {
    console.log('[OrderService] Processing detailed mode order:', orderId);

    // Atualizar status para LYRICS_PENDING antes de gerar
    await supabase
      .from('orders')
      .update({ status: 'LYRICS_PENDING' })
      .eq('id', orderId);

    // Tentar gerar letras com timeout e retry
    const lyricsResult = await this.generateLyricsWithRetry(orderId, briefing, audioInsert);

    if (!lyricsResult.success) {
      console.error('[OrderService] Lyrics generation failed:', lyricsResult.error);
      return {
        success: false,
        action: 'dashboard',
        orderId,
        error: lyricsResult.error,
        message: 'Erro ao gerar letras. Tente novamente pelo dashboard.',
      };
    }

    return {
      success: true,
      action: 'create-song',
      orderId,
    };
  }

  // ─────────── LYRICS GENERATION WITH RETRY ───────────
  private static async generateLyricsWithRetry(
    orderId: string,
    briefing: BriefingPayload,
    audioInsert?: { section: string; mode: string; transcript: string } | null,
    attempt = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invokePromise = supabase.functions.invoke('generate-lyrics', {
        body: {
          orderId,
          story: briefing.story,
          briefing,
          language: resolveGenerationLanguage(briefing.language, MusicCreationService.getActiveLanguage()),
          ...(audioInsert ? { audioInsert } : {}),
        },
      });

      // Timeout real usando Promise.race
      const response = await withTimeout(
        invokePromise,
        LYRICS_TIMEOUT_MS,
        'geração de letras'
      );

      if (response.error) {
        throw new Error(
          typeof response.error === 'string'
            ? response.error
            : response.error?.message || 'Erro na invocação da função'
        );
      }

      if (!response.data?.ok) {
        throw new Error(response.data?.error || 'Resposta inválida da geração de letras');
      }

      console.log('[OrderService] Lyrics generated successfully for order:', orderId);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[OrderService] Lyrics attempt ${attempt + 1} failed:`, msg);

      if (attempt < MAX_RETRIES) {
        console.log(`[OrderService] Retrying lyrics generation (attempt ${attempt + 2})...`);
        // Wait 2 seconds before retry
        await new Promise((r) => setTimeout(r, 2000));
        return this.generateLyricsWithRetry(orderId, briefing, audioInsert, attempt + 1);
      }

      return { success: false, error: msg };
    }
  }

  // ─────────── BACKGROUND LYRICS (for quick mode) ───────────
  private static async generateLyricsBackground(
    orderId: string,
    briefing: BriefingPayload
  ): Promise<void> {
    console.log('[OrderService] Starting background lyrics generation for:', orderId);

    try {
      const response = await withTimeout(
        supabase.functions.invoke('generate-lyrics', {
          body: {
            orderId,
            story: briefing.story,
            briefing,
            autoApprove: true,
            language: resolveGenerationLanguage(briefing.language, MusicCreationService.getActiveLanguage()),
          },
        }),
        LYRICS_TIMEOUT_MS,
        'geração de letras (background)'
      );

      if (response.error || !response.data?.ok) {
        const errorMsg = response.error?.message || response.data?.error || 'Unknown error';
        console.error('[OrderService] Background lyrics failed:', errorMsg);

        // Marcar pedido como recuperável para o dashboard detectar
        await this.markOrderRecoverable(orderId);
        return;
      }

      console.log('[OrderService] Background lyrics completed for:', orderId);
    } catch (err) {
      console.error('[OrderService] Background lyrics timeout/error:', err);
      await this.markOrderRecoverable(orderId);
    }
  }

  // ─────────── RECOVERY ───────────

  /**
   * Mark an order as needing recovery (lyrics generation failed).
   * The dashboard will detect this and show a retry button.
   */
  private static async markOrderRecoverable(orderId: string): Promise<void> {
    try {
      // Keep status as PAID or LYRICS_PENDING - dashboard will detect the 0 lyrics
      console.log('[OrderService] Marking order as recoverable:', orderId);
      await supabase
        .from('orders')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', orderId);
    } catch (err) {
      console.error('[OrderService] Failed to mark order recoverable:', err);
    }
  }

  /**
   * Retry lyrics generation for a stuck order.
   * Called from the dashboard when the user clicks "Retry".
   */
  static async retryLyricsGeneration(orderId: string): Promise<ProcessingResult> {
    console.log('[OrderService] Retrying lyrics for stuck order:', orderId);

    try {
      // Fetch order data
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        return {
          success: false,
          action: 'error',
          orderId,
          error: 'Pedido não encontrado',
        };
      }

      // Verify order is in a retryable state
      if (!['PAID', 'LYRICS_PENDING'].includes(order.status)) {
        return {
          success: false,
          action: 'error',
          orderId,
          error: `Pedido não está em estado recuperável (status: ${order.status})`,
        };
      }

      // Update status
      await supabase
        .from('orders')
        .update({ status: 'LYRICS_PENDING' })
        .eq('id', orderId);

      // Build briefing from saved order data
      const briefing: BriefingPayload = {
        isInstrumental: order.is_instrumental || false,
        hasCustomLyric: order.has_custom_lyric || false,
        story: order.story || '',
        language: order.language || undefined,
        musicType: order.music_type || 'homenagem',
        emotion: order.emotion || 'alegria',
        emotionIntensity: order.emotion_intensity || 3,
        style: order.music_style || 'pop',
        rhythm: order.rhythm || 'moderado',
        atmosphere: order.atmosphere || 'festivo',
        voiceType: order.voice_type || 'feminina',
        hasMonologue: order.has_monologue || false,
        monologuePosition: order.monologue_position || 'bridge',
        mandatoryWords: order.mandatory_words || '',
        restrictedWords: order.restricted_words || '',
        songName: order.song_title || '',
        autoGenerateName: !order.song_title,
        structure: order.music_structure ? JSON.parse(order.music_structure) : ['verse', 'chorus'],
      };

      // Check if order has audio insert data
      let audioInsert = null;
      if (order.audio_input_id) {
        // Get transcription for this audio
        const { data: transcription } = await supabase
          .from('transcriptions')
          .select('transcript_text')
          .eq('audio_id', order.audio_input_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (transcription?.transcript_text) {
          audioInsert = {
            section: 'VERSE',
            mode: 'light_edit',
            transcript: transcription.transcript_text,
          };
        }
      }

      const result = await this.generateLyricsWithRetry(orderId, briefing, audioInsert);

      if (result.success) {
        return {
          success: true,
          action: 'create-song',
          orderId,
          message: 'Letras geradas com sucesso!',
        };
      }

      return {
        success: false,
        action: 'error',
        orderId,
        error: result.error || 'Falha ao gerar letras',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: 'error',
        orderId,
        error: msg,
      };
    }
  }
}
