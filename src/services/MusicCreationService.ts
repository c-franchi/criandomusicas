import { supabase } from "@/integrations/supabase/client";
import { OrderStatusService } from "./OrderStatusService";
import i18n from "@/lib/i18n";

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
  error?: string;
}

let approvalInFlight = false;

export class MusicCreationService {
  static async createMusic(params: ApproveLyricsParams): Promise<ApprovalResult> {
    if (params.briefing?.isInstrumental) {
      return this.generateInstrumental(params);
    }

    return this.approveLyrics(params);
  }

  static async approveLyrics(params: ApproveLyricsParams): Promise<ApprovalResult> {
    if (approvalInFlight) {
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

      const normalizedCoverUrl = this.normalizeCoverUrl(params.customCoverUrl);

      // 🔁 retry até 2 vezes para erro transitório
      const result = await this.tryGenerateWithRetry({
        ...params,
        customCoverUrl: normalizedCoverUrl,
      });

      if (result.ok) {
        return { success: true };
      }

      // fallback silencioso
      const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
      if (postCheck) {
        return { success: true, alreadyProcessed: true };
      }

      return { success: false, error: result.error || "Erro temporário ao gerar música" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      try {
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) return { success: true, alreadyProcessed: true };
      } catch {}

      return { success: false, error: msg };
    } finally {
      approvalInFlight = false;
    }
  }

  // 🔥 RETRY INTELIGENTE
  private static async tryGenerateWithRetry(params: ApproveLyricsParams): Promise<{ ok: boolean; error?: string }> {
    for (let attempt = 1; attempt <= 2; attempt++) {
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

      // sucesso
      if (!error && data?.ok) {
        return { ok: true };
      }

      // erro transitório (AI Gateway / timeout)
      const isTemporary =
        error?.message?.includes("timeout") ||
        error?.message?.includes("502") ||
        error?.message?.includes("503") ||
        error?.message?.includes("500") ||
        data?.error?.includes("temporário") ||
        data?.error?.includes("tente novamente");

      if (attempt < 2 && isTemporary) {
        await this.delay(1200);
        continue;
      }

      return { ok: false, error: data?.error || error?.message };
    }

    return { ok: false, error: "Falha desconhecida" };
  }

  private static async generateInstrumental(params: ApproveLyricsParams): Promise<ApprovalResult> {
    const normalizedCoverUrl = this.normalizeCoverUrl(params.customCoverUrl);

    const { data, error } = await supabase.functions.invoke("generate-style-prompt", {
      body: {
        orderId: params.orderId,
        lyricId: "instrumental",
        approvedLyrics: "",
        songTitle: params.songTitle,
        pronunciations: [],
        hasCustomLyric: false,
        customCoverUrl: normalizedCoverUrl,
        coverMode: params.coverMode || "auto",
        language: this.getActiveLanguage(),
        briefing: {
          ...params.briefing,
          isInstrumental: true,
        },
      },
    });

    if (error) return { success: false, error: error.message };
    if (!data?.ok) return { success: false, error: data?.error };

    return { success: true };
  }

  static getActiveLanguage(): string {
    return i18n.resolvedLanguage || i18n.language || "pt-BR";
  }

  private static normalizeCoverUrl(url?: string | null): string | null {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;

    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  private static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
