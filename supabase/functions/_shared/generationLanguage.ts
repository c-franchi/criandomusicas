export type GenerationLanguage = 'pt-BR' | 'en' | 'es' | 'it';

export function normalizeGenerationLanguage(value: unknown): GenerationLanguage | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace('_', '-').toLowerCase();
  if (normalized === 'pt' || normalized.startsWith('pt-')) return 'pt-BR';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'es' || normalized.startsWith('es-')) return 'es';
  if (normalized === 'it' || normalized.startsWith('it-')) return 'it';
  return null;
}

export function resolveGenerationLanguage(...candidates: unknown[]): GenerationLanguage {
  for (const candidate of candidates) {
    const language = normalizeGenerationLanguage(candidate);
    if (language) return language;
  }
  return 'pt-BR';
}

const englishLanguageNames: Record<GenerationLanguage, string> = {
  'pt-BR': 'Portuguese (Brazil)',
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
};

export function generationLanguageEnglishName(language: unknown): string {
  return englishLanguageNames[resolveGenerationLanguage(language)];
}

const vocalInstructions: Record<GenerationLanguage, string> = {
  'pt-BR': 'Brazilian Portuguese vocals, sung in Brazilian Portuguese',
  en: 'English vocals, sung in English',
  es: 'Spanish vocals, sung in Spanish',
  it: 'Italian vocals, sung in Italian',
};

export function vocalLanguageInstruction(language: unknown): string {
  return vocalInstructions[resolveGenerationLanguage(language)];
}

export function withVocalLanguage(stylePrompt: string, vocalStyle: string, language: unknown): string {
  const requirement = `Vocal: ${vocalStyle.split(',')[0]}, ${vocalLanguageInstruction(language)}`;
  if (/^Vocal:/im.test(stylePrompt)) {
    return stylePrompt.replace(/^Vocal:.*$/im, requirement);
  }

  const separator = stylePrompt.trim() ? '\n' : '';
  const available = Math.max(0, 950 - requirement.length - separator.length);
  return `${stylePrompt.trim().slice(0, available).trim()}${separator}${requirement}`;
}

const titleExamples: Record<GenerationLanguage, { regular: string; ambient: string }> = {
  'pt-BR': {
    regular: '"Aurora Dourada", "Ventos do Sul", "Despertar Épico"',
    ambient: '"Serenidade", "Momento de Paz", "Brisa Suave"',
  },
  en: {
    regular: '"Golden Dawn", "Southern Winds", "Epic Awakening"',
    ambient: '"Serenity", "Moment of Peace", "Gentle Breeze"',
  },
  es: {
    regular: '"Aurora Dorada", "Vientos del Sur", "Despertar Épico"',
    ambient: '"Serenidad", "Momento de Paz", "Brisa Suave"',
  },
  it: {
    regular: '"Aurora Dorata", "Venti del Sud", "Risveglio Epico"',
    ambient: '"Serenità", "Momento di Pace", "Brezza Leggera"',
  },
};

export function instrumentalTitleExamples(language: unknown, ambient = false): string {
  const examples = titleExamples[resolveGenerationLanguage(language)];
  return ambient ? examples.ambient : examples.regular;
}

const modificationLabels: Record<GenerationLanguage, { instructions: string; previous: string }> = {
  'pt-BR': {
    instructions: 'INSTRUÇÕES DE AJUSTE DO USUÁRIO',
    previous: 'LETRA ANTERIOR PARA REFERÊNCIA',
  },
  en: {
    instructions: 'USER REVISION INSTRUCTIONS',
    previous: 'PREVIOUS LYRICS FOR REFERENCE',
  },
  es: {
    instructions: 'INSTRUCCIONES DE MODIFICACIÓN DEL USUARIO',
    previous: 'LETRA ANTERIOR COMO REFERENCIA',
  },
  it: {
    instructions: "ISTRUZIONI DI MODIFICA DELL'UTENTE",
    previous: 'TESTO PRECEDENTE COME RIFERIMENTO',
  },
};

export function buildModificationStory(
  story: string,
  instructions: string,
  previousLyrics: string,
  language: unknown,
): string {
  const labels = modificationLabels[resolveGenerationLanguage(language)];
  return `${story}\n\n[${labels.instructions}]: ${instructions}\n\n[${labels.previous}]:\n${previousLyrics}`;
}
