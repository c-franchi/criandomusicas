import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { inspectShortLyric } from '../../supabase/functions/_shared/shortLyrics.ts';
import * as generationLanguage from '../../supabase/functions/_shared/generationLanguage.ts';

globalThis.__styleShortRules = { inspectShortLyric };
globalThis.__styleLanguage = generationLanguage;
globalThis.__styleUpdates = [];
globalThis.Deno = { env: { get: name => name === 'SUPABASE_URL' ? 'https://fixture.invalid' : 'fixture-key' } };
globalThis.__styleDb = {
  from: table => {
    const q = {
      select: () => q,
      eq: () => q,
      update: data => { if (table === 'orders') globalThis.__styleUpdates.push(data); return q; },
      insert: () => q,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => table === 'orders'
        ? { data: { language: 'it', style_prompt: null, song_title: null, has_custom_lyric: false }, error: null }
        : { data: null, error: null },
      then: resolve => resolve({ data: null, error: null }),
    };
    return q;
  },
  functions: { invoke: async () => ({ data: { ok: true }, error: null }) },
};

let source = readFileSync(new URL('../../supabase/functions/generate-style-prompt/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*shortLyrics.ts.*$/m, 'const { inspectShortLyric } = globalThis.__styleShortRules;')
  .replace(/import \{[\s\S]*?\} from "..\/_shared\/generationLanguage.ts";/, `const {
    generationLanguageEnglishName, instrumentalTitleExamples, resolveGenerationLanguage,
    vocalLanguageInstruction, withVocalLanguage,
  } = globalThis.__styleLanguage;`)
  .replace(/^import .*http\/server.ts.*$/m, 'const serve = callback => { globalThis.__styleHandler = callback; };')
  .replace(/^import .*supabase-js.*$/m, 'const createClient = () => globalThis.__styleDb;');
await import('data:text/javascript,' + encodeURIComponent(transformSync(source, { loader: 'ts', format: 'esm' }).code));

async function generate(isInstrumental) {
  const aiCalls = [];
  globalThis.__styleUpdates = [];
  globalThis.fetch = async (url, options) => {
    if (!String(url).includes('chat/completions')) return Response.json({ ok: true });
    const body = JSON.parse(options.body);
    aiCalls.push(body);
    const content = isInstrumental && aiCalls.length === 1
      ? 'Titolo di Prova'
      : '[Style]\nGenre: Pop\nVocal: Female solo vocalist\nTempo: 90 BPM';
    return Response.json({ choices: [{ message: { content } }] });
  };
  const response = await globalThis.__styleHandler(new Request('https://fixture.invalid', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'order', language: 'pt-BR', isInstrumental,
      lyricId: isInstrumental ? undefined : '123e4567-e89b-12d3-a456-426614174000',
      approvedLyrics: isInstrumental ? '' : 'Un testo semplice',
      briefing: { voiceType: 'feminina', instruments: ['piano'] },
    }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  return { aiCalls, updates: globalThis.__styleUpdates };
}

test('instrumental AI title request and saved title use stored Italian order language', async () => {
  const { aiCalls, updates } = await generate(true);
  const titlePrompt = aiCalls[0].messages[0].content;
  assert.match(titlePrompt, /Title in Italian/);
  assert.match(titlePrompt, /Aurora Dorata/);
  assert.doesNotMatch(titlePrompt, /Title in Portuguese|Aurora Dourada/);
  assert.equal(updates.at(-1).song_title, 'Titolo di Prova');
  assert.equal(updates.at(-1).language, 'it');
});

test('vocal style saved for production explicitly requires Italian singing', async () => {
  const { aiCalls, updates } = await generate(false);
  assert.match(aiCalls[0].messages[0].content, /Italian vocals, sung in Italian/);
  assert.match(updates.at(-1).style_prompt, /^Vocal: Female solo vocalist, Italian vocals, sung in Italian$/m);
  assert.equal(updates.at(-1).language, 'it');
});
