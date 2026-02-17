/**
 * Profanity filter for lyrics content.
 * Blocks words that would cause music generation services to reject the content.
 */

// Comprehensive list of forbidden terms (Portuguese + English)
const FORBIDDEN_WORDS = [
  // Portuguese profanity
  'porra', 'caralho', 'buceta', 'puta', 'putaria', 'puteiro',
  'foda', 'fodase', 'foda-se', 'fodido', 'fodendo',
  'merda', 'bosta', 'cú', 'arrombado', 'arrombada',
  'viado', 'viada', 'vagabunda', 'vagabundo',
  'desgraça', 'desgraçado', 'desgraçada',
  'piranha', 'vadia', 'vadio',
  'cacete', 'pau no cu', 'vai se fuder', 'vai tomar no cu',
  'filha da puta', 'filho da puta', 'fdp',
  'pqp', 'vsf', 'tnc', 'krl',
  'cuzão', 'cuzao', 'corno',
  'xereca', 'xoxota', 'rola', 'pinto', 'piroca',
  'punheta', 'punheteiro', 'brocha',
  // Hate speech / slurs
  'macaco', 'macaca', // racial slur context
  'retardado', 'retardada',
  // Violence
  'matar', 'assassinar', 'estupro', 'estuprar',
  'suicídio', 'suicidio', 'se matar',
  // Drug references that block generation
  'cocaína', 'cocaina', 'crack', 'maconha', 'droga',
  'cheirar pó', 'baseado',
  // English profanity (also blocked by music services)
  'fuck', 'fucking', 'shit', 'bitch', 'asshole',
  'motherfucker', 'dick', 'pussy', 'cunt',
  'nigger', 'nigga', 'faggot',
];

// Normalize text for comparison (remove accents, lowercase)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' '); // Replace special chars with space
}

/**
 * Check text for forbidden words.
 * Returns list of found forbidden terms.
 */
export function findForbiddenWords(text: string): string[] {
  const normalizedText = normalize(text);
  const found: string[] = [];

  for (const word of FORBIDDEN_WORDS) {
    const normalizedWord = normalize(word);
    // Use word boundary matching for single words, substring for phrases
    if (normalizedWord.includes(' ')) {
      // Multi-word phrase: check as substring
      if (normalizedText.includes(normalizedWord)) {
        found.push(word);
      }
    } else {
      // Single word: check with word boundaries
      const regex = new RegExp(`\\b${normalizedWord}\\b`, 'g');
      if (regex.test(normalizedText)) {
        found.push(word);
      }
    }
  }

  return [...new Set(found)]; // Deduplicate
}

/**
 * Returns true if text contains forbidden words.
 */
export function hasForbiddenWords(text: string): boolean {
  return findForbiddenWords(text).length > 0;
}
