import { supabase } from "@/integrations/supabase/client";
import { OrderStatusService } from "./OrderStatusService";
import i18n from "@/lib/i18n";

/**
 * MusicCreationService
 * Serviço unificado para todas as formas de criação de música.
 * Centraliza a lógica de aprovação, geração de style prompt e proteção contra clique duplo.
 *
 * Correções incluídas:
 * - Letra própria (custom lyric): não entra em loop. Se approvedLyrics vier vazio, busca em orders.story.
 * - Pronúncia: auto-corrige (não pede ao usuário). Faz retry automático quando Edge retornar missingPronunciations.
 * - NÃO retorna missingPronunciations para UI (para não mostrar modal/erro com lista pro usuário).
 * - Capa: normaliza URL e não bloqueia geração se URL inválida/blob/base64 gigante.
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

    // opcionais (não quebram compatibilidade)
    isInstrumental?: boolean;
    hasCustomLyric?: boolean;
    songName?: string;
  };
}

export interface ApprovalResult {
  success: boolean;
  alreadyProcessed?: boolean;

  /**
   * Mantido por compatibilidade retroativa,
   * mas NÃO vamos mais popular isso (para não aparecer pro usuário).
   */
  missingPronunciations?: string[];

  error?: string;
}

// Proteção contra clique duplo
let approvalInFlight = false;

export class MusicCreationService {
  /**
   * Método unificado (opcional). Mantém compatibilidade.
   * Se você ainda não usa, não atrapalha.
   */
  static async createMusic(params: ApproveLyricsParams): Promise<ApprovalResult> {
    if (params?.briefing?.isInstrumental) {
      return this.generateInstrumental(params);
    }

    // Letra própria: aprova direto (não chama generate-lyrics)
    if (params?.briefing?.hasCustomLyric || params?.hasCustomLyric) {
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
   * - Se Edge falhar mas order já estiver atualizada, considera sucesso
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
        return { success: false, error: validation?.reason || "Não é possível aprovar agora." };
      }

      const normalizedCoverUrl = this.normalizeCoverUrl(params.customCoverUrl);
      const coverMode = params.coverMode || "auto";

      // 🔒 Letra própria: se approvedLyrics vier vazio, buscar do story (evita loop/travar)
      const approvedLyricsResolved = await this.resolveApprovedLyrics(params.orderId, {
        approvedLyrics: params.approvedLyrics,
        hasCustomLyric: !!(params.hasCustomLyric || params.briefing?.hasCustomLyric || params.lyricId === "custom"),
        isInstrumental: !!params.briefing?.isInstrumental,
      });

      // base pronunciations (do usuário) + auto prévia (para reduzir missingPronunciations na 1ª tentativa)
      const basePronunciations = params.pronunciations || [];
      const preAuto = this.buildAutoPronunciationsFromText(approvedLyricsResolved, basePronunciations);

      // 1) primeira tentativa
      const first = await this.invokeGenerateStylePrompt({
        ...params,
        approvedLyrics: approvedLyricsResolved,
        customCoverUrl: normalizedCoverUrl,
        coverMode,
        pronunciations: preAuto,
        hasCustomLyric: !!(params.hasCustomLyric || params.briefing?.hasCustomLyric),
        lyricId:
          params.lyricId || (params.hasCustomLyric || params.briefing?.hasCustomLyric ? "custom" : params.lyricId),
      });

      if (first.ok) return { success: true };

      // 2) se falhou por missingPronunciations -> gera automaticamente e tenta de novo (SEM usuário)
      if (first.missingPronunciations?.length) {
        const auto = this.buildAutoPronunciations(first.missingPronunciations, preAuto);

        const second = await this.invokeGenerateStylePrompt({
          ...params,
          approvedLyrics: approvedLyricsResolved,
          customCoverUrl: normalizedCoverUrl,
          coverMode,
          pronunciations: auto,
          hasCustomLyric: !!(params.hasCustomLyric || params.briefing?.hasCustomLyric),
          lyricId:
            params.lyricId || (params.hasCustomLyric || params.briefing?.hasCustomLyric ? "custom" : params.lyricId),
        });

        if (second.ok) return { success: true };

        // fallback: se Edge falhou mas banco já atualizou, trata como sucesso
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) return { success: true, alreadyProcessed: true };

        // NÃO expor termos ao usuário
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
      } catch {
        // ignore
      }

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

    if (error) {
      // se deu erro mas o banco já foi atualizado, trata como sucesso
      try {
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) return { success: true, alreadyProcessed: true };
      } catch {
        // ignore
      }
      return { success: false, error: error.message };
    }

    if (!data?.ok) {
      // se Edge respondeu não-ok mas banco já foi atualizado, trata como sucesso
      try {
        const postCheck = await OrderStatusService.isAlreadyProcessed(params.orderId);
        if (postCheck) return { success: true, alreadyProcessed: true };
      } catch {
        // ignore
      }
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
   * Invoca a Edge Function e padroniza retorno (inclusive missingPronunciations)
   * IMPORTANTE: a UI NÃO deve mostrar missingPronunciations; usamos apenas internamente.
   */
  private static async invokeGenerateStylePrompt(
    params: ApproveLyricsParams,
  ): Promise<{ ok: boolean; missingPronunciations?: string[]; error?: string }> {
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
   * Resolve approvedLyrics:
   * - Instrumental => ""
   * - Se for letra própria e vier vazio => busca em orders.story
   * - Caso contrário => usa o que veio
   */
  private static async resolveApprovedLyrics(
    orderId: string,
    ctx: { approvedLyrics: string; hasCustomLyric: boolean; isInstrumental: boolean },
  ): Promise<string> {
    if (ctx.isInstrumental) return "";

    const provided = (ctx.approvedLyrics || "").trim();
    if (provided) return provided;

    if (!ctx.hasCustomLyric) {
      // não é custom lyric: se veio vazio, devolve vazio (Edge vai tratar)
      return "";
    }

    try {
      const { data, error } = await supabase.from("orders").select("story").eq("id", orderId).single();

      if (error) {
        console.warn("[MusicCreation] Failed to fetch story for custom lyrics:", error.message);
        return "";
      }

      const story = (data?.story || "").trim();
      return story;
    } catch (e) {
      console.warn("[MusicCreation] Failed to fetch story for custom lyrics (exception):", e);
      return "";
    }
  }

  /**
   * Normaliza URL da capa
   * - "" -> null
   * - inválida -> null
   * - blob: -> null (não é acessível pela Edge)
   * - data:image (base64) -> aceita só se não for gigantesca
   */
  private static normalizeCoverUrl(url?: string | null): string | null {
    if (!url) return null;

    const trimmed = String(url).trim();
    if (!trimmed) return null;

    // blob URL não funciona no servidor (Edge Function)
    if (trimmed.startsWith("blob:")) {
      console.warn("[MusicCreation] Ignoring blob: cover url (not reachable by Edge)");
      return null;
    }

    // Evita mandar base64 gigantes por engano
    if (trimmed.startsWith("data:image")) {
      if (trimmed.length > 2_000_000) {
        console.warn("[MusicCreation] Ignoring huge base64 cover");
        return null;
      }
      return trimmed;
    }

    // URLs normais
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
   * Auto-pronúncias “preventivas” varrendo o texto (para reduzir missingPronunciations na 1ª tentativa)
   * - pega ALL CAPS (>=2) e cria N-L-C
   */
  private static buildAutoPronunciationsFromText(
    text: string,
    existing: Array<{ term: string; phonetic: string }>,
  ): Array<{ term: string; phonetic: string }> {
    const base = new Map<string, string>();
    for (const p of existing) {
      if (p?.term && p?.phonetic) base.set(p.term, p.phonetic);
    }

    const result = new Map(base);

    if (!text) {
      return Array.from(result.entries()).map(([term, phonetic]) => ({ term, phonetic }));
    }

    const capsMatches = text.match(/\b[A-ZÀ-Ú0-9]{2,}\b/g) || [];
    for (const term of capsMatches) {
      if (result.has(term)) continue;
      // evita transformar números puros
      if (/^\d+$/.test(term)) continue;
      result.set(term, term.split("").join("-"));
    }

    return Array.from(result.entries()).map(([term, phonetic]) => ({ term, phonetic }));
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
    } catch {
      // ignore
    }

    return null;
  }
}
