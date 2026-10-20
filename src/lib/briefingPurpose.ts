/**
 * Purpose-first entry for the briefing ("Qual é a finalidade da sua música?").
 * Pure mapping logic so it can be unit tested without rendering Briefing.
 */

export type PurposeId =
  | 'gift'
  | 'company_team'
  | 'company_anthem'
  | 'company_jingle'
  | 'company_voiceover'
  | 'motivation'
  | 'faith'
  | 'kids'
  | 'video'
  | 'custom_lyric'
  | 'instrumental'
  | 'audio';

export const PURPOSE_IDS: PurposeId[] = [
  'gift', 'company_team', 'company_anthem', 'company_jingle', 'company_voiceover',
  'motivation', 'faith', 'kids', 'video', 'custom_lyric', 'instrumental', 'audio',
];

export const isPurposeId = (v: string | null | undefined): v is PurposeId =>
  !!v && (PURPOSE_IDS as string[]).includes(v);

/** Purposes handled by the short (quick) form. */
export type QuickPurpose = 'gift' | 'company_team' | 'motivation';

export interface PurposeFormPatch {
  musicType?: string;
  isInstrumental?: boolean;
  hasCustomLyric?: boolean;
  corporateFormat?: 'institucional' | 'jingle' | 'monologo' | '';
  hasMonologue?: boolean;
  monologuePosition?: string;
  motivationalMoment?: string;
}

export type PurposeStart =
  | { kind: 'quick'; quickPurpose: QuickPurpose; planId: string; patch: PurposeFormPatch }
  | { kind: 'chat'; step: number; planId: string; patch: PurposeFormPatch }
  | { kind: 'audio' };

/** Where each purpose goes. Chat step indexes match chatFlow in Briefing.tsx. */
export const getPurposeStart = (purpose: PurposeId): PurposeStart => {
  const vocal = { isInstrumental: false, hasCustomLyric: false };
  switch (purpose) {
    case 'gift':
      return { kind: 'quick', quickPurpose: 'gift', planId: 'single', patch: { ...vocal, musicType: 'homenagem' } };
    case 'company_team':
      // Motivating a team is a motivational song for work — not institutional/jingle
      return { kind: 'quick', quickPurpose: 'company_team', planId: 'single', patch: { ...vocal, musicType: 'motivacional', motivationalMoment: 'trabalho' } };
    case 'motivation':
      return { kind: 'quick', quickPurpose: 'motivation', planId: 'single', patch: { ...vocal, musicType: 'motivacional' } };
    case 'company_anthem':
      return { kind: 'chat', step: 10, planId: 'single', patch: { ...vocal, musicType: 'corporativa', corporateFormat: 'institucional', hasMonologue: false, monologuePosition: '' } };
    case 'company_jingle':
      return { kind: 'chat', step: 32, planId: 'single', patch: { ...vocal, musicType: 'corporativa', corporateFormat: 'jingle', hasMonologue: true, monologuePosition: 'outro' } };
    case 'company_voiceover':
      return { kind: 'chat', step: 80, planId: 'single', patch: { ...vocal, musicType: 'corporativa', corporateFormat: 'monologo', hasMonologue: true, monologuePosition: 'full' } };
    case 'faith':
      return { kind: 'chat', step: 44, planId: 'single', patch: { ...vocal, musicType: 'religiosa' } };
    case 'kids':
      return { kind: 'chat', step: 60, planId: 'single', patch: { ...vocal, musicType: 'infantil' } };
    case 'video':
      return { kind: 'chat', step: 70, planId: 'single', patch: { ...vocal, musicType: 'trilha' } };
    case 'custom_lyric':
      return { kind: 'chat', step: 22, planId: 'single_custom_lyric', patch: { isInstrumental: false, hasCustomLyric: true } };
    case 'instrumental':
      return { kind: 'chat', step: 1, planId: 'single_instrumental', patch: { isInstrumental: true, hasCustomLyric: false } };
    case 'audio':
      return { kind: 'audio' };
  }
};

export type Energy = 'calma' | 'crescente' | 'intensa';

export interface QuickMappingInput {
  style: string;
  isInstrumental: boolean;
  energy?: Energy;
  moment?: string;
}

export interface QuickMappingResult {
  musicType: string;
  emotion: string;
  atmosphere: string;
  rhythm: string;
  motivationalMoment?: string;
  motivationalIntensity?: string;
  motivationalNarrative?: string;
}

/** Converts the short form into briefing fields according to the chosen purpose. */
export const mapQuickPurpose = (purpose: QuickPurpose | null, input: QuickMappingInput): QuickMappingResult => {
  if (purpose === 'company_team' || purpose === 'motivation') {
    const energy: Energy = input.energy || 'crescente';
    return {
      musicType: 'motivacional',
      emotion: energy === 'calma' ? 'confianca' : 'determinacao',
      atmosphere: energy === 'calma' ? 'leve' : 'epico',
      rhythm: energy === 'intensa' ? 'animado' : 'moderado',
      motivationalMoment: purpose === 'company_team' ? 'trabalho' : (input.moment || undefined),
      motivationalIntensity: energy,
      motivationalNarrative: 'cantada',
    };
  }
  // Gift / tribute (also legacy quick entries without purpose)
  return {
    musicType: input.style === 'infantil' ? 'infantil' : 'homenagem',
    emotion: 'amor',
    atmosphere: 'festivo',
    rhythm: 'moderado',
  };
};
