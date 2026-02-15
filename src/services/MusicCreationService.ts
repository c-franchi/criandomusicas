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
   * 🔹 Método unificado para criação de música
   * Decide automaticamente o fluxo:
   * - Instrumental
   * - Letra própria
   * - Futuras expansões
   */
  static async createMusic(options: {
    orderId?: string;
    story: string;
    briefing: any;
    pronunciations?: Array<{ term: string; phonetic: string }>;
    customCoverUrl?: string | null;
    coverMode?: string;
  }): Promise<ApprovalResult> {
    let { orderId } = options;

    // ==============================
    // 🔹 Garantir que exista uma order
    // ==============================
    if (!orderId) {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          status: "DRAFT",
          story: options.story,
          has_custom_lyric: options.briefing?.hasCustomLyric === true,
          is_instrumental: options.briefing?.isInstrumental === true,
        })
        .select()
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || "Erro ao criar pedido" };
      }

      orderId = data.id;
    }

    // ==============================
    // 🔹 Instrumental
    // ==============================
    if (options.briefing?.isInstrumental === true) {
      return this.approveLyrics({
        orderId,
        lyricId: "instrumental",
        approvedLyrics: "",
        songTitle: options.briefing?.songName || "",
        customCoverUrl: options.customCoverUrl,
        coverMode: options.coverMode,
        briefing: options.briefing,
      });
    }

    // ==============================
    // 🔹 Letra própria
    // ==============================
    if (options.briefing?.hasCustomLyric === true) {
      return this.approveLyrics({
        orderId,
        lyricId: "custom",
        approvedLyrics: options.story,
        songTitle: options.briefing?.songName || "",
        pronunciations: options.pronunciations || [],
        hasCustomLyric: true,
        customCoverUrl: options.customCoverUrl,
        coverMode: options.coverMode,
        briefing: options.briefing,
      });
    }

    return {
      success: false,
      error: "Fluxo inválido ou não implementado",
    };
  }

  /**
   * 🔹 Aprovar letra e gerar style prompt.
   * Inclui proteção contra clique duplo e validação de status no banco.
   */
  static async approveLyrics(params: ApproveLyricsParams): Promise<ApprovalResult> {
    if (approvalInFlight) {
      console.log("[MusicCreation] Approval already in flight, ignoring duplicate");
      return { success: false, error: "Ação já em andamento" };
    }

    approvalInFlight = true;

    try {
      const validation = await OrderStatusService.canApproveLyrics(params.orderId);

      if (validation.alreadyApproved) {
        console.log("[MusicCreation] Order already approved, treating as success");
        return { success: true, alreadyProcessed: true };
      }

      if (!validation.canApprove) {
        return { success: false, error: validation.reason };
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
          briefing: params.briefing,
        },
      });

      if (error) {
        const errorData = this.parseEdgeFunctionError(error);

        if (errorData?.missingPronunciations?.length) {
          return { success: false, missingPronunciations: errorData.missingPronunciations };
        }

        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) {
          return { success: true, alreadyProcessed: true };
        }

        return { success: false, error: errorData?.error || error.message || "Erro na função" };
      }

      if (!data?.ok) {
        if (data?.missingPronunciations?.length) {
          return { success: false, missingPronunciations: data.missingPronunciations };
        }

        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) {
          return { success: true, alreadyProcessed: true };
        }

        return { success: false, error: data?.error || "Erro ao gerar prompt de estilo" };
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
   * Idioma ativo
   */
  static getActiveLanguage(): string {
    return i18n.language || "pt-BR";
  }

  /**
   * Parse erro da edge function
   */
  private static parseEdgeFunctionError(error: any): any {
    try {
      const ctx = error?.context;
      if (ctx?.body) {
        return typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
      }
      const match = error.message?.match(/body\s*({.+})/);
      if (match) return JSON.parse(match[1]);
    } catch {}
    return null;
  }
}
