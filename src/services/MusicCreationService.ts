import { supabase } from "@/integrations/supabase/client";
import { OrderStatusService } from "./OrderStatusService";
import i18n from "@/lib/i18n";

/**
 * MusicCreationService
 * Serviço unificado para todas as formas de criação de música.
 * Centraliza a lógica de aprovação, geração de style prompt e proteção contra clique duplo.
 */

export interface ApproveLyricsParams {
  orderId: string;
  lyricId: string;
  approvedLyrics: string;
  songTitle: string;
  pronunciations?: Array<{ term: string; phonetic: string }>;
  hasCustomLyric?: boolean;
  customCoverUrl?: string | null;
  coverMode?: string;
  briefing: {
    musicType: string;
    emotion: string;
    emotionIntensity: number;
    style: string;
    rhythm: string;
    atmosphere: string;
    hasMonologue?: boolean;
    voiceType?: string;
  };
}

export interface ApprovalResult {
  success: boolean;
  alreadyProcessed?: boolean;
  missingPronunciations?: string[];
  error?: string;
}

// In-flight protection: prevents double-click on approve
let approvalInFlight = false;

export class MusicCreationService {
  /**
   * Aprovar letra e gerar style prompt.
   * Inclui proteção contra clique duplo e validação de status no banco.
   */
  static async approveLyrics(params: ApproveLyricsParams): Promise<ApprovalResult> {
    // 1. Double-click protection
    if (approvalInFlight) {
      console.log('[MusicCreation] Approval already in flight, ignoring duplicate');
      return { success: false, error: 'Ação já em andamento' };
    }
    approvalInFlight = true;

    try {
      // 2. Validate fresh status from DB
      const validation = await OrderStatusService.canApproveLyrics(params.orderId);
      
      if (validation.alreadyApproved) {
        console.log('[MusicCreation] Order already approved, treating as success');
        return { success: true, alreadyProcessed: true };
      }

      if (!validation.canApprove) {
        return { success: false, error: validation.reason };
      }

      // 3. Call generate-style-prompt edge function
      const { data, error } = await supabase.functions.invoke('generate-style-prompt', {
        body: {
          orderId: params.orderId,
          lyricId: params.lyricId,
          approvedLyrics: params.approvedLyrics,
          songTitle: params.songTitle,
          pronunciations: params.pronunciations || [],
          hasCustomLyric: params.hasCustomLyric || false,
          customCoverUrl: params.customCoverUrl || null,
          coverMode: params.coverMode || 'auto',
          briefing: params.briefing,
        },
      });

      // 4. Handle edge function error
      if (error) {
        // Try to parse error body for pronunciation issues
        const errorData = this.parseEdgeFunctionError(error);
        
        if (errorData?.missingPronunciations?.length) {
          return { success: false, missingPronunciations: errorData.missingPronunciations };
        }

        // Check if DB was already updated despite the error
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) {
          console.log('[MusicCreation] DB already updated despite error, treating as success');
          return { success: true, alreadyProcessed: true };
        }

        return { success: false, error: errorData?.error || error.message || 'Erro na função' };
      }

      // 5. Handle response body
      if (!data?.ok) {
        if (data?.missingPronunciations?.length) {
          return { success: false, missingPronunciations: data.missingPronunciations };
        }
        
        // Even if response says not ok, check if DB was updated
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) {
          return { success: true, alreadyProcessed: true };
        }

        return { success: false, error: data?.error || 'Erro ao gerar prompt de estilo' };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MusicCreation] Unexpected error:', msg);

      // Last resort: check if DB was updated
      try {
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) {
          return { success: true, alreadyProcessed: true };
        }
      } catch { /* ignore */ }

      return { success: false, error: msg };
    } finally {
      approvalInFlight = false;
    }
  }

  /**
   * Get the current active language for lyrics generation.
   */
  static getActiveLanguage(): string {
    return i18n.language || 'pt-BR';
  }

  /**
   * Parse edge function error to extract structured data
   */
  private static parseEdgeFunctionError(error: any): any {
    try {
      const ctx = error?.context;
      if (ctx?.body) {
        return typeof ctx.body === 'string' ? JSON.parse(ctx.body) : ctx.body;
      }
      const match = error.message?.match(/body\s*({.+})/);
      if (match) return JSON.parse(match[1]);
    } catch { /* ignore */ }
    return null;
  }
}
