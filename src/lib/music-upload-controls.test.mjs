import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { outputFiles } = buildSync({
  entryPoints: [fileURLToPath(new URL('../components/admin/MusicUploadControls.tsx', import.meta.url))],
  alias: { '@': fileURLToPath(new URL('..', import.meta.url)) },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, jsx: 'automatic',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { MusicUploadControls } = module.exports;
const render = (order, uploading = null) => renderToStaticMarkup(React.createElement(MusicUploadControls, { order, uploading, onUpload() {} }));
const base = { id: 'order', user_id: 'owner', approved_lyric_id: 'lyric', status: 'MUSIC_GENERATING' };

test('completed one-track orders still show an optional upload, without replacing released audio', () => {
  const html = render({ ...base, status: 'COMPLETED', uploadedVersions: [1] });
  assert.match(html, /Versão 2 \(opcional\)/);
  assert.doesNotMatch(html, /Enviar música principal/);
  assert.equal((html.match(/type="file"/g) || []).length, 1);
});
test('second gift recording waits for the selected primary and both controls lock during upload', () => {
  const order = { ...base, gift: { duration_seconds: 15, track_version: 1, music_source: 'new' } };
  assert.equal((render(order).match(/disabled=""/g) || []).length, 1);
  assert.equal((render(order, 'order-v1').match(/disabled=""/g) || []).length, 2);
});
test('fully delivered or existing-music gift orders do not offer new audio uploads', () => {
  assert.equal(render({ ...base, status: 'COMPLETED', uploadedVersions: [1, 2] }), '');
  assert.equal(render({ ...base, gift: { duration_seconds: null, track_version: 1, music_source: 'existing' } }), '');
});
