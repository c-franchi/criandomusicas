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
    isInstrumental?: boolean;
    hasCustomLyric?: boolean;
    songName?: string;
  };
}

export interface ApprovalResult {
  success: boolean;
  alreadyProcessed?: boolean;
  missingPronunciations?: string[];
  error?: string;
}

// Proteção contra clique duplo
let approvalInFlight = false;

export class MusicCreationService {
  /**
   * Método unificado para criação.
   * Detecta automaticamente se é instrumental ou letra customizada.
   */
  static async createMusic(params: ApproveLyricsParams): Promise<ApprovalResult> {
    if (params.briefing?.isInstrumental) {
      return this.generateInstrumental(params);
    }

    if (params.briefing?.hasCustomLyric) {
      return this.approveLyrics(params);
    }

    return this.approveLyrics(params);
  }

  /**
   * Aprovar letra e gerar style prompt.
   */
  static async approveLyrics(params: ApproveLyricsParams): Promise<ApprovalResult> {
    if (approvalInFlight) {
      console.log("[MusicCreation] Approval already in flight");
      return { success: false, error: "Ação já em andamento" };
    }

    approvalInFlight = true;

    try {
      const validation = await OrderStatusService.canApproveLyrics(params.orderId);

      if (validation?.alreadyApproved) {
        return { success: true, alreadyProcessed: true };
      }

      if (!validation?.canApprove) {
        return { success: false, error: validation?.reason };
      }

      const { data, error } = await supabase.functions.invoke("generate-style-prompt", {
        body: {
          orderId: params.orderId,
          lyricId: params.lyricId,
          approvedLyrics: params.approvedLyrics,
          songTitle: params.songTitle,
          pronunciations: params.pronunciations || [],
          hasCustomLyric: params.hasCustomLyric || false,
          customCoverUrl: params.customCoverUrl || null,
          coverMode: params.coverMode || "auto",
          language: this.getActiveLanguage(),
          briefing: params.briefing,
        },
      });

      if (error) {
        const parsed = this.parseEdgeFunctionError(error);

        if (parsed?.missingPronunciations?.length) {
          return {
            success: false,
            missingPronunciations: parsed.missingPronunciations,
          };
        }

        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);

        if (postCheck) {
          return { success: true, alreadyProcessed: true };
        }

        return { success: false, error: parsed?.error || error.message };
      }

      if (!data?.ok) {
        if (data?.missingPronunciations?.length) {
          return {
            success: false,
            missingPronunciations: data.missingPronunciations,
          };
        }

        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);

        if (postCheck) {
          return { success: true, alreadyProcessed: true };
        }

        return {
          success: false,
          error: data?.error || "Erro ao gerar música",
        };
      }

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[MusicCreation] Unexpected error:", msg);

      try {
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) {
          return { success: true, alreadyProcessed: true };
        }
      } catch {}

      return { success: false, error: msg };
    } finally {
      approvalInFlight = false;
    }
  }

  /**
   * Fluxo exclusivo para instrumental.
   * Não gera letras.
   */
  private static async generateInstrumental(params: ApproveLyricsParams): Promise<ApprovalResult> {
    const { data, error } = await supabase.functions.invoke("generate-style-prompt", {
      body: {
        orderId: params.orderId,
        lyricId: "instrumental",
        approvedLyrics: "",
        songTitle: params.songTitle,
        pronunciations: [],
        hasCustomLyric: false,
        customCoverUrl: params.customCoverUrl || null,
        coverMode: params.coverMode || "auto",
        language: this.getActiveLanguage(),
        briefing: {
          ...params.briefing,
          isInstrumental: true,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.ok) {
      return { success: false, error: data?.error || "Erro instrumental" };
    }

    return { success: true };
  }

  /**
   * Idioma ativo para geração
   */
  static getActiveLanguage(): string {
    return i18n.resolvedLanguage || i18n.language || "pt-BR";
  }

  /**
   * Extrai erro estruturado da Edge Function
   */
  private static parseEdgeFunctionError(error: any): any {
    try {
      const ctx = error?.context;

      if (ctx?.body) {
        return typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
      }

      const match = error?.message?.match(/body\s*({.+})/);
      if (match) return JSON.parse(match[1]);
    } catch {}

    return null;
  }
}
