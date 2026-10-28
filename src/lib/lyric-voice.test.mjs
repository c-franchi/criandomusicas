import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { lyricVoiceRules } from '../../supabase/functions/_shared/lyricVoice.ts';
import { inspectShortLyric, shortLyricLimits } from '../../supabase/functions/_shared/shortLyrics.ts';

// Exercise the actual HTTP handler with fake AI/database boundaries. No paid calls.
let gift = null, aiCalls = [], inserts = [];
globalThis.__voiceRules = lyricVoiceRules;
globalThis.__shortRules = { inspectShortLyric, shortLyricLimits };
globalThis.Deno = { env: { get: name => name === 'SUPABASE_URL' ? 'https://fixture.invalid' : 'fixture-key' } };
globalThis.__voiceDb = {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
  rpc: async name => ({ data: name === 'claim_gift_lyrics', error: null }),
  from: table => {
    let insert = false;
    const q = {
      select: () => q, eq: () => q, update: () => q,
      insert: data => { insert = true; inserts.push(...data); return q; },
      maybeSingle: async () => ({ data: gift, error: null }),
      single: async () => ({ data: { user_id: 'owner' }, error: null }),
      then: resolve => resolve({ data: insert ? [{ id: 'a' }, { id: 'b' }] : null, error: null }),
    };
    return q;
  },
};
let source = readFileSync(new URL('../../supabase/functions/generate-lyrics/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*shortLyrics.ts.*$/m, 'const { inspectShortLyric, shortLyricLimits } = globalThis.__shortRules;')
  .replace(/^import .*lyricVoice.ts.*$/m, 'const lyricVoiceRules = globalThis.__voiceRules;')
  .replace(/^import .*http\/server.ts.*$/m, 'const serve = callback => { globalThis.__lyricsHandler = callback; };')
  .replace(/^import .*supabase-js.*$/m, 'const createClient = () => globalThis.__voiceDb;');
await import('data:text/javascript,' + encodeURIComponent(transformSync(source, { loader: 'ts', format: 'esm' }).code));

async function generate({ duration = null, modification = false, standalone = false, perspective = '', audioInsert } = {}) {
  gift = standalone ? null : {
    owner_id: 'owner', product: duration ? 'short' : 'digital', duration_seconds: duration,
    is_test: false, payment_confirmed_at: '2026-10-28', details: { language: 'pt-BR' },
    sender_name: 'Claudinei', recipient_name: 'Maria',
  };
  aiCalls = []; inserts = [];
  globalThis.fetch = async (url, options) => {
    if (!String(url).includes('chat/completions')) return Response.json({ ok: true });
    aiCalls.push(JSON.parse(options.body));
    return Response.json({ choices: [{ message: { content: modification
      ? 'Meu recado\n[Verse]\nEu te amo'
      : 'Meu recado\n[Verse]\nEu te amo\n---\nMeu carinho\n[Verse]\nQuero te abraçar' } }] });
  };
  const response = await globalThis.__lyricsHandler(new Request('https://fixture.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer fixture-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: standalone ? undefined : 'order',
      story: 'Claudinei quer dizer para Maria que ama muito ela.',
      briefing: { musicType: 'homenagem', motivationalPerspective: perspective },
      autoApprove: true, isModification: modification, audioInsert,
    }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  return aiCalls[0].messages;
}
test('personal gift prompts identify the sender as speaker, not an external narrator', async () => {
  const messages = await generate();
  assert.match(messages[0].content, /PRIMEIRA PESSOA/);
  assert.match(messages[0].content, /Remetente \(voz da mensagem\): "Claudinei"/);
  assert.match(messages[0].content, /Destinatário \(quem ouve a mensagem\): "Maria"/);
  assert.match(messages[0].content, /eu te amo/);
  assert(inserts.every(lyric => !lyric.is_approved));
});
test('short 15s/30s replacement prompts retain first-person voice and length limits', async () => {
  for (const duration of [15, 30]) {
    const messages = await generate({ duration });
    assert.match(messages[0].content, new RegExp(`within ${duration} seconds`));
    assert.match(messages[0].content, /PRIMEIRA PESSOA/);
    assert.match(messages[0].content, /"Claudinei"/);
  }
});
test('revisions retain the voice instruction and still create only an unapproved revision', async () => {
  const messages = await generate({ modification: true, duration: 15 });
  assert.match(messages[0].content, /Output ONE version/);
  assert.match(messages[0].content, /PRIMEIRA PESSOA/);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].version, 'M');
  assert.equal(inserts[0].is_approved, false);
});
test('ordinary/audio-mode songs preserve explicit perspective and literal audio excerpts', async () => {
  const messages = await generate({ standalone: true, perspective: 'mentor',
    audioInsert: { section: 'VERSE', mode: 'keep_exact', transcript: 'Claudinei te ama' } });
  assert.match(messages[0].content, /formulário: "mentor"/);
  assert.match(messages[0].content, /Respeite uma escolha EXPLÍCITA/);
  assert.match(messages[1].content, /EXATAMENTE como transcrito/);
  assert.match(messages[1].content, /Claudinei te ama/);
  assert.equal(inserts.length, 0);
});
