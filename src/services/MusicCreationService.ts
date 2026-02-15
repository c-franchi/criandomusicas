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

    // Letra própria: aprova direto (não chama generate-lyrics)
    if (params.briefing?.hasCustomLyric) {
      return this.approveLyrics({
        ...params,
        hasCustomLyric: true,
        lyricId: params.lyricId || "custom",
      });
    }

    return this.approveLyrics(params);
  }

  /**
   * Aprovar letra e gerar style prompt.
   * - Protege clique duplo
   * - Valida status no banco
   * - Auto-corrige pronúncias (não pede ao usuário)
   * - Retry automático 1x caso a Edge retorne missingPronunciations
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

      const normalizedCoverUrl = this.normalizeCoverUrl(params.customCoverUrl);
      const basePronunciations = params.pronunciations || [];

      // 1) primeira tentativa
      const first = await this.invokeGenerateStylePrompt({
        ...params,
        customCoverUrl: normalizedCoverUrl,
        pronunciations: basePronunciations,
      });

      if (first.ok) return { success: true };

      // 2) se falhou por missingPronunciations -> gera automaticamente e tenta de novo (SEM usuário)
      if (first.missingPronunciations?.length) {
        const auto = this.buildAutoPronunciations(first.missingPronunciations, basePronunciations);

        const second = await this.invokeGenerateStylePrompt({
          ...params,
          customCoverUrl: normalizedCoverUrl,
          pronunciations: auto,
        });

        if (second.ok) return { success: true };

        // Se ainda falhar, NÃO mostrar lista pro usuário
        console.warn("[MusicCreation] Still missing pronunciations after auto-fix:", second.missingPronunciations);
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) return { success: true, alreadyProcessed: true };

        return { success: false, error: second.error || "Não foi possível aprovar a letra automaticamente." };
      }

      // fallback: se Edge falhou mas banco já atualizou, trata como sucesso
      const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
      if (postCheck) {
        return { success: true, alreadyProcessed: true };
      }

      return { success: false, error: first.error || "Erro ao aprovar letra" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[MusicCreation] Unexpected error:", msg);

      try {
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) return { success: true, alreadyProcessed: true };
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
    if (!data?.ok) return { success: false, error: data?.error || "Erro instrumental" };

    return { success: true };
  }

  /**
   * Idioma ativo para geração
   */
  static getActiveLanguage(): string {
    return i18n.resolvedLanguage || i18n.language || "pt-BR";
  }

  /**
   * Invoca a Edge Function e padroniza retorno (inclusive missingPronunciations)
   */
  private static async invokeGenerateStylePrompt(params: ApproveLyricsParams): Promise<{
    ok: boolean;
    missingPronunciations?: string[];
    error?: string;
  }> {
    const normalizedCoverUrl = this.normalizeCoverUrl(params.customCoverUrl);

    const { data, error } = await supabase.functions.invoke("generate-style-prompt", {
      body: {
        orderId: params.orderId,
        lyricId: params.lyricId,
        approvedLyrics: params.approvedLyrics,
        songTitle: params.songTitle,
        pronunciations: params.pronunciations || [],
        hasCustomLyric: params.hasCustomLyric || false,
        customCoverUrl: normalizedCoverUrl,
        coverMode: params.coverMode || "auto",
        language: this.getActiveLanguage(),
        briefing: params.briefing,
      },
    });

    // erro “técnico”
    if (error) {
      const parsed = this.parseEdgeFunctionError(error);
      if (parsed?.missingPronunciations?.length) {
        return { ok: false, missingPronunciations: parsed.missingPronunciations };
      }
      return { ok: false, error: parsed?.error || error.message };
    }

    // erro “lógico” (data.ok false)
    if (!data?.ok) {
      if (data?.missingPronunciations?.length) {
        return { ok: false, missingPronunciations: data.missingPronunciations };
      }
      return { ok: false, error: data?.error || "Falha ao gerar prompt" };
    }

    return { ok: true };
  }

  /**
   * Normaliza URL da capa
   * - "" -> null
   * - inválida -> null
   * - undefined -> null
   */
  private static normalizeCoverUrl(url?: string | null): string | null {
    if (!url) return null;

    const trimmed = String(url).trim();
    if (!trimmed) return null;

    // Evita mandar base64 gigantes por engano
    if (trimmed.startsWith("data:image")) {
      // deixa passar apenas se for pequeno
      if (trimmed.length > 2_000_000) return null;
      return trimmed;
    }

    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  /**
   * Gera pronunciations automáticas para termos que a Edge reclamou.
   * Regras simples e seguras p/ Suno:
   * - ALL CAPS => separa com hífen (E-X-P-L-O-S-I-V-O)
   * - palavra normal => lowercase
   * - se já existe, não duplica
   */
  private static buildAutoPronunciations(
    missing: string[],
    existing: Array<{ term: string; phonetic: string }>,
  ): Array<{ term: string; phonetic: string }> {
    const map = new Map<string, string>();

    for (const p of existing) {
      if (p?.term && p?.phonetic) map.set(p.term, p.phonetic);
    }

    for (const termRaw of missing) {
      const term = String(termRaw || "").trim();
      if (!term) continue;
      if (map.has(term)) continue;

      const isAllCaps = /^[A-ZÀ-Ú0-9]+$/.test(term) && /[A-ZÀ-Ú]/.test(term);

      // Ex: "NLC" => "N-L-C"
      if (isAllCaps) {
        map.set(term, term.split("").join("-"));
        continue;
      }

      // Ex: "Explosivo" => "explosivo"
      map.set(term, term.toLowerCase());
    }

    return Array.from(map.entries()).map(([term, phonetic]) => ({ term, phonetic }));
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
