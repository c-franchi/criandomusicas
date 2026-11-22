import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildModificationStory,
  generationLanguageEnglishName,
  instrumentalTitleExamples,
  normalizeGenerationLanguage,
  resolveGenerationLanguage,
  vocalLanguageInstruction,
  withVocalLanguage,
} from '../../supabase/functions/_shared/generationLanguage.ts';

test('regional interface locales normalize to the four order languages', () => {
  assert.equal(normalizeGenerationLanguage('it-IT'), 'it');
  assert.equal(normalizeGenerationLanguage('en-US'), 'en');
  assert.equal(normalizeGenerationLanguage('es-ES'), 'es');
  assert.equal(normalizeGenerationLanguage('pt'), 'pt-BR');
  assert.equal(normalizeGenerationLanguage('fr-FR'), null);
  assert.equal(resolveGenerationLanguage(null, 'it-IT'), 'it');
  assert.equal(resolveGenerationLanguage(undefined, 'fr-FR'), 'pt-BR');
});

test('instrumental titles and examples use the selected language', () => {
  assert.equal(generationLanguageEnglishName('it'), 'Italian');
  assert.match(instrumentalTitleExamples('it'), /Aurora Dorata/);
  assert.match(instrumentalTitleExamples('it', true), /Momento di Pace/);
  assert.doesNotMatch(instrumentalTitleExamples('it'), /Aurora Dourada/);
});

test('vocal style always contains the exact singing language', () => {
  assert.equal(vocalLanguageInstruction('it'), 'Italian vocals, sung in Italian');
  const prompt = withVocalLanguage('[Style]\nGenre: Pop\nVocal: Female solo vocalist\nTempo: 90 BPM', 'Female solo vocalist, expressive', 'it');
  assert.match(prompt, /^Vocal: Female solo vocalist, Italian vocals, sung in Italian$/m);
  assert.doesNotMatch(prompt, /Brazilian Portuguese vocals/);
  const withoutVocalLine = withVocalLanguage(`[Style]\n${'x'.repeat(1000)}`, 'Female solo vocalist', 'it');
  assert.match(withoutVocalLine, /Italian vocals, sung in Italian$/);
  assert(withoutVocalLine.length <= 950);
});

test('revision context labels follow the order language without translating the lyrics', () => {
  const story = buildModificationStory('Storia originale', 'Rendi il ritornello più intimo', 'Testo precedente', 'it');
  assert.match(story, /\[ISTRUZIONI DI MODIFICA DELL'UTENTE\]: Rendi il ritornello più intimo/);
  assert.match(story, /\[TESTO PRECEDENTE COME RIFERIMENTO\]:\nTesto precedente/);
  assert.doesNotMatch(story, /INSTRUÇÕES|LETRA ANTERIOR/);
});

test('checkout generation calls and payment verification propagate language', () => {
  const checkout = readFileSync(new URL('../pages/Checkout.tsx', import.meta.url), 'utf8');
  const generationCalls = checkout.match(/functions\.invoke\('generate-(?:style-prompt|lyrics)'/g) || [];
  const languagePayloads = checkout.match(/language: getGenerationLanguage\(orderData\)/g) || [];
  assert.equal(generationCalls.length, 6);
  assert.equal(languagePayloads.length, generationCalls.length);

  const verification = readFileSync(new URL('../../supabase/functions/verify-payment/index.ts', import.meta.url), 'utf8');
  assert.match(verification, /const generationLanguage = resolveGenerationLanguage\(orderData\.language, requestedLanguage\)/);
  assert.equal((verification.match(/language: generationLanguage/g) || []).length, 2);
});
