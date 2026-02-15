import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { OrderStatusService } from "@/services/OrderStatusService";

export interface MusicCreationBriefing {
  musicType: string;
  emotion: string;
  emotionIntensity: number;
  style: string;
  rhythm: string;
  atmosphere: string;
  structure: string[];
  hasMonologue: boolean;
  monologuePosition: string;
  mandatoryWords: string;
  restrictedWords: string;
  songName?: string;
  autoGenerateName?: boolean;
  voiceType?: string;
  hasCustomLyric?: boolean;
  isInstrumental?: boolean;
  instruments?: string[];
  soloInstrument?: string;
  soloMoment?: string;
  instrumentationNotes?: string;
  motivationalNarrative?: string;
  motivationalMoment?: string;
  motivationalIntensity?: string;
  motivationalPerspective?: string;
}

export interface LyricPayload {
  id?: string;
  title?: string;
  text?: string;
  body?: string;
}

export interface MusicCreationFunctionResponse {
  ok?: boolean;
  error?: string;
  lyrics?: LyricPayload[];
  missingPronunciations?: string[];
  alreadyProcessed?: boolean;
  [key: string]: unknown;
}

export interface CreateLyricsResult {
  orderId: string;
  data?: MusicCreationFunctionResponse;
  error?: unknown;
}

export interface GenerateStylePromptResult {
  data?: MusicCreationFunctionResponse;
  error?: unknown;
}

export interface ApproveLyricsResult {
  data?: MusicCreationFunctionResponse;
  error?: unknown;
}

const getCurrentI18nLanguage = () => i18n.resolvedLanguage || i18n.language;

export class MusicCreationService {
  static async createMusic(options: {
    userId?: string;
    orderId?: string;
    story: string;
    briefing: MusicCreationBriefing;
  }): Promise<CreateLyricsResult | GenerateStylePromptResult> {
    const { briefing } = options;

    if (briefing.isInstrumental) {
      return this.createInstrumental(options);
    }

    if (briefing.hasCustomLyric) {
      return this.createFromCustomLyrics({
        orderId: options.orderId,
        story: options.story,
        briefing,
      });
    }

    return this.createLyrics(options);
  }

  static async createLyrics(options: {
    userId?: string;
    orderId?: string;
    story: string;
    briefing: MusicCreationBriefing;
    isModification?: boolean;
  }): Promise<CreateLyricsResult> {
    const { userId, briefing, story, isModification } = options;
    let { orderId } = options;

    if (!orderId) {
      if (!userId) {
        return {
          orderId: "",
          error: new Error(i18n.t("dashboard:createSong.needLogin")),
        };
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          status: "DRAFT",
          music_style: briefing.style,
          emotion: briefing.emotion,
          tone: briefing.rhythm,
          music_structure: briefing.structure.join(","),
          story: story,
          music_type: briefing.musicType,
          emotion_intensity: briefing.emotionIntensity,
          rhythm: briefing.rhythm,
          atmosphere: briefing.atmosphere,
          has_monologue: briefing.hasMonologue,
          monologue_position: briefing.monologuePosition,
          mandatory_words: briefing.mandatoryWords,
          restricted_words: briefing.restrictedWords,
        })
        .select()
        .single();

      if (orderError || !orderData) {
        return {
          orderId: "",
          error: orderError || new Error(i18n.t("dashboard:createSong.createOrderError")),
        };
      }

      orderId = orderData.id;
    }

    const { data, error } = await supabase.functions.invoke("generate-lyrics", {
      body: {
        orderId,
        story,
        language: getCurrentI18nLanguage(),
        briefing: {
          musicType: briefing.musicType,
          emotion: briefing.emotion,
          emotionIntensity: briefing.emotionIntensity,
          style: briefing.style,
          rhythm: briefing.rhythm,
          atmosphere: briefing.atmosphere,
          structure: briefing.structure,
          hasMonologue: briefing.hasMonologue,
          monologuePosition: briefing.monologuePosition,
          mandatoryWords: briefing.mandatoryWords,
          restrictedWords: briefing.restrictedWords,
          songName: briefing.songName,
          autoGenerateName: briefing.autoGenerateName,
          voiceType: briefing.voiceType,
          motivationalNarrative: briefing.motivationalNarrative,
          motivationalMoment: briefing.motivationalMoment,
          motivationalIntensity: briefing.motivationalIntensity,
          motivationalPerspective: briefing.motivationalPerspective,
        },
        ...(isModification ? { isModification: true } : {}),
      },
    });

    return { orderId, data, error };
  }

  static async createInstrumental(options: {
    orderId?: string;
    story: string;
    briefing: MusicCreationBriefing;
  }): Promise<GenerateStylePromptResult> {
    if (!options.orderId) {
      return { error: new Error(i18n.t("dashboard:createSong.orderDataNotFound")) };
    }

    return this.generateStylePrompt({
      orderId: options.orderId,
      lyricId: "instrumental",
      approvedLyrics: "",
      songTitle: options.briefing.songName || "",
      pronunciations: [],
      hasCustomLyric: false,
      briefing: {
        ...options.briefing,
        isInstrumental: true,
        instruments: options.briefing.instruments || [],
        soloInstrument: options.briefing.soloInstrument,
        soloMoment: options.briefing.soloMoment,
        instrumentationNotes: options.briefing.instrumentationNotes,
      },
    });
  }

  static async createFromCustomLyrics(options: {
    orderId?: string;
    story: string;
    briefing: MusicCreationBriefing;
  }): Promise<ApproveLyricsResult> {
    if (!options.orderId) {
      return { error: new Error(i18n.t("dashboard:createSong.orderDataNotFound")) };
    }

    return this.approveLyrics({
      orderId: options.orderId,
      lyricId: "custom",
      approvedLyrics: options.story,
      songTitle: options.briefing.songName || "",
      pronunciations: [],
      hasCustomLyric: true,
      briefing: options.briefing,
    });
  }

  static async approveLyrics(options: {
    orderId: string;
    lyricId: string;
    approvedLyrics: string;
    songTitle: string;
    pronunciations: { term: string; phonetic: string }[];
    hasCustomLyric: boolean;
    customCoverUrl?: string | null;
    coverMode?: string;
    briefing: {
      musicType?: string;
      emotion?: string;
      emotionIntensity?: number;
      style?: string;
      rhythm?: string;
      atmosphere?: string;
      hasMonologue?: boolean;
      voiceType?: string;
      isInstrumental?: boolean;
      instruments?: string[];
      soloInstrument?: string | null;
      soloMoment?: string | null;
      instrumentationNotes?: string;
      motivationalNarrative?: string;
      motivationalMoment?: string;
      motivationalIntensity?: string;
      motivationalPerspective?: string;
      monologuePosition?: string;
    };
  }): Promise<ApproveLyricsResult> {
    const response = await this.generateStylePrompt(options);

    if (response.error || !response.data?.ok) {
      const hasMissingPronunciations = response.data?.missingPronunciations?.length;

      if (!hasMissingPronunciations) {
        const alreadyProcessed = await OrderStatusService.checkIfAlreadyProcessed(options.orderId);

        if (alreadyProcessed) {
          return { data: { ok: true, alreadyProcessed: true } };
        }
      }
    }

    return response;
  }

  static async generateStylePrompt(options: {
    orderId: string;
    lyricId: string;
    approvedLyrics: string;
    songTitle: string;
    pronunciations: { term: string; phonetic: string }[];
    hasCustomLyric: boolean;
    customCoverUrl?: string | null;
    coverMode?: string;
    briefing: {
      musicType?: string;
      emotion?: string;
      emotionIntensity?: number;
      style?: string;
      rhythm?: string;
      atmosphere?: string;
      hasMonologue?: boolean;
      voiceType?: string;
      isInstrumental?: boolean;
      instruments?: string[];
      soloInstrument?: string | null;
      soloMoment?: string | null;
      instrumentationNotes?: string;
      motivationalNarrative?: string;
      motivationalMoment?: string;
      motivationalIntensity?: string;
      motivationalPerspective?: string;
      monologuePosition?: string;
    };
  }): Promise<GenerateStylePromptResult> {
    const { data, error } = await supabase.functions.invoke("generate-style-prompt", {
      body: {
        orderId: options.orderId,
        lyricId: options.lyricId,
        approvedLyrics: options.approvedLyrics,
        songTitle: options.songTitle,
        pronunciations: options.pronunciations,
        hasCustomLyric: options.hasCustomLyric,
        customCoverUrl: options.customCoverUrl,
        coverMode: options.coverMode,
        briefing: options.briefing,
      },
    });

    return { data, error };
  }
}
