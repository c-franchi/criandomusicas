import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getNextStep } from './nextStep.ts';
import {
  audioSampleFallbackDescription,
  generationNotificationCopy,
  musicReadyEmailCopy,
  purchaseEmailCopy,
  transcriptionLanguageCode,
  transcriptionPrompt,
} from '../../supabase/functions/_shared/orderLanguageCopy.ts';

test('audio transcription uses the selected language in code and instructions', () => {
  assert.equal(transcriptionLanguageCode('it-IT'), 'it');
  assert.equal(transcriptionLanguageCode('pt-BR'), 'pt');
  assert.match(transcriptionPrompt('it'), /Trascrizione fedele in italiano/);
  assert.doesNotMatch(transcriptionPrompt('it'), /português brasileiro/);
});

test('automatic payment, lyrics and review notices follow the order language', () => {
  const copy = generationNotificationCopy('it');
  assert.equal(copy.paymentTitle, '✅ Pagamento confermato!');
  assert.equal(copy.lyricsTitle, '✨ Testi pronti!');
  assert.match(copy.reviewBody, /Valuta la tua canzone personalizzata/);
  assert.equal(copy.giftReadyTitle, '🎁 Il tuo regalo musicale è disponibile!');
  assert.equal(copy.status.MUSIC_READY.body, 'La tua musica è pronta da ascoltare!');
  assert.equal(copy.creditTitle, '🎵 Ordine ricevuto!');
});

test('sample fallbacks and music-ready emails follow the order language', () => {
  assert.equal(audioSampleFallbackDescription('it'), 'Una canzone unica, creata con cura ed emozione.');
  assert.equal(audioSampleFallbackDescription('it', 'Matrimonio'), 'Una canzone speciale creata per celebrare matrimonio.');
  const copy = musicReadyEmailCopy('it');
  assert.equal(copy.headerReady, 'La tua musica è pronta!');
  assert.equal(copy.giftTitle, 'Il tuo regalo musicale è disponibile!');
  assert.equal(copy.subjectReady.replace('{title}', 'Per Te'), '🎉 "Per Te" è pronta da ascoltare!');
});

test('purchase email copy and formatting follow the stored locale', () => {
  const copy = purchaseEmailCopy('it');
  assert.equal(copy.confirmationTitle, 'Conferma di acquisto');
  assert.equal(copy.nextSingle[1], 'La tua musica sarà consegnata entro 48 ore');
  assert.equal(copy.subject.replace('{plan}', 'Singolo'), '🎵 Conferma di acquisto - Singolo');
});

test('next-step cards follow the order language and preserve their destination', () => {
  const step = getNextStep({ id: 'order', status: 'MUSIC_READY', language: 'it' });
  assert.equal(step.label, 'Ascolta la mia musica');
  assert.equal(step.description, 'La tua musica è pronta!');
  assert.equal(step.url, '/pedido/order');
});

test('legacy lyric URLs delegate to the canonical order-language flow', () => {
  const page = readFileSync(new URL('../pages/OrderLyricsPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /useParams<\{ orderId: string \}>/);
  assert.match(page, /\/criar-musica\?orderId=/);
  assert.doesNotMatch(page, /firebase|\/api\/generate-lyrics/);
});
