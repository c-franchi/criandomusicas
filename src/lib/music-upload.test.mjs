import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveMusicUpload } from './music-upload.ts';

const order = { id: 'order', user_id: 'owner', status: 'MUSIC_GENERATING', approved_lyric_id: 'lyric' };
const file = new File(['audio fixture'], 'song.mp3', { type: 'audio/mpeg' });
function fixture({ initial = [], fail = '' } = {}) {
  const calls = [], tracks = [...initial];
  const client = {
    storage: { from: () => ({
      upload: async path => { calls.push(['upload', path]); return { error: fail === 'upload' ? Error('offline') : null }; },
      getPublicUrl: path => ({ data: { publicUrl: `https://fixture.invalid/${path}` } }),
      remove: async paths => { calls.push(['remove', paths]); return { error: null }; },
    }) },
    from: table => {
      if (table === 'tracks') return {
        upsert: async data => {
          calls.push(['track', data]);
          if (fail === 'track') return { error: Error('rejected') };
          const i = tracks.findIndex(t => t.version === data.version);
          if (i >= 0) tracks[i] = data; else tracks.push(data);
          return { error: null };
        },
        select: () => ({ eq: () => ({ eq: async () => ({ data: tracks, error: fail === 'read' ? Error('offline') : null }) }) }),
      };
      assert.equal(table, 'orders'); // Completion must never write to musical_gifts.
      return { update: data => ({ eq: async () => {
        calls.push(['order', data]); return { error: fail === 'order' ? Error('denied') : null };
      } }) };
    },
  };
  return { client, calls, tracks };
}
test('one recording completes the order without fabricating a second track', async () => {
  const f = fixture();
  const result = await saveMusicUpload(f.client, file, order, 1, null);
  assert.deepEqual(result.uploadedVersions, [1]);
  assert.equal(result.newlyCompleted, true);
  assert.equal(f.tracks.length, 1);
  assert.equal(f.calls.at(-1)[1].status, 'COMPLETED');
});
test('optional second upload remains possible after completion and keeps the primary audio', async () => {
  const f = fixture({ initial: [{ version: 1, audio_url: 'https://fixture.invalid/primary.mp3' }] });
  const result = await saveMusicUpload(f.client, file, { ...order, status: 'COMPLETED' }, 2, null);
  assert.deepEqual(result.uploadedVersions, [1, 2]);
  assert.equal(result.audioUrl, 'https://fixture.invalid/primary.mp3');
  assert.equal(result.newlyCompleted, false);
  assert.equal('music_ready_at' in f.calls.at(-1)[1], false);
});
test('a single version 2 also completes an ordinary music order', async () => {
  const f = fixture();
  assert.deepEqual((await saveMusicUpload(f.client, file, order, 2, null)).uploadedVersions, [2]);
});
test('gift completion uses only the selected track and leaves release to ADM', async () => {
  const f = fixture();
  const giftOrder = { ...order, gift: { music_source: 'new', duration_seconds: 15, track_version: 1 } };
  await assert.rejects(() => saveMusicUpload(f.client, file, giftOrder, 2, 14), /principal/);
  assert(!f.calls.some(c => c[0] === 'order'));
  const result = await saveMusicUpload(f.client, file, giftOrder, 1, 14);
  assert(result.audioUrl.includes('-v1-'));
  assert.equal(f.calls.at(-1)[1].status, 'COMPLETED');
});
test('short gifts require approval and a valid measured duration before storage upload', async () => {
  const f = fixture();
  const g = { ...order, gift: { music_source: 'new', duration_seconds: 15, track_version: 1 } };
  for (const duration of [null, NaN, -1, 0, 16, 41]) {
    await assert.rejects(() => saveMusicUpload(f.client, file, g, 1, duration), /até 15s/);
  }
  await assert.rejects(() => saveMusicUpload(f.client, file, { ...g, approved_lyric_id: null }, 1, 14), /aprovação/);
  assert.equal(f.calls.length, 0);
});
test('storage and track errors do not complete an order; rejected tracks remove the new upload', async () => {
  for (const fail of ['upload', 'track']) {
    const f = fixture({ fail });
    await assert.rejects(() => saveMusicUpload(f.client, file, order, 1, null));
    assert(!f.calls.some(c => c[0] === 'order'));
    assert.equal(f.calls.some(c => c[0] === 'remove'), fail === 'track');
  }
});
test('failure after saving audio is reported and keeps the recording for recovery', async () => {
  for (const fail of ['read', 'order']) {
    const f = fixture({ fail });
    await assert.rejects(() => saveMusicUpload(f.client, file, order, 1, null), /áudio foi salvo/);
    assert.equal(f.tracks.length, 1);
    assert(!f.calls.some(c => c[0] === 'remove'));
  }
});
