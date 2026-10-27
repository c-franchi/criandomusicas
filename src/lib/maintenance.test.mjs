import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceDecision, isMaintenanceExemptPath } from './maintenance.ts';

const state = { path: '/', authLoading: false, settingsLoading: false, settingsError: false, enabled: true, signedIn: false, roleLoading: false, isAdmin: false };

test('maintenance covers home, new products and direct order/checkout links', () => {
  for (const path of ['/', '/cartao-digital', '/musicas-curtas', '/cartao-fisico', '/briefing', '/checkout/123', '/pedido/123', '/m/123']) {
    assert.equal(maintenanceDecision({ ...state, path }), 'maintenance', path);
  }
});
test('signed-in customers cannot bypass active maintenance', () => {
  assert.equal(maintenanceDecision({ ...state, signedIn: true }), 'maintenance');
});
test('verified administrators can test even during maintenance or settings outage', () => {
  assert.equal(maintenanceDecision({ ...state, signedIn: true, isAdmin: true }), 'allow');
  assert.equal(maintenanceDecision({ ...state, signedIn: true, isAdmin: true, settingsError: true }), 'allow');
});
test('signed-out identity never reuses an admin bypass', () => {
  assert.equal(maintenanceDecision({ ...state, isAdmin: true }), 'maintenance');
});
test('identity and role checks finish before content is displayed', () => {
  assert.equal(maintenanceDecision({ ...state, authLoading: true }), 'loading');
  assert.equal(maintenanceDecision({ ...state, signedIn: true, roleLoading: true }), 'loading');
});
test('settings load blocks content and settings errors fail closed', () => {
  assert.equal(maintenanceDecision({ ...state, settingsLoading: true }), 'loading');
  assert.equal(maintenanceDecision({ ...state, enabled: false, settingsError: true }), 'maintenance');
});
test('disabling maintenance releases visitors and customers', () => {
  assert.equal(maintenanceDecision({ ...state, enabled: false }), 'allow');
  assert.equal(maintenanceDecision({ ...state, enabled: false, signedIn: true }), 'allow');
});
test('admin recovery redirects guests to login even when settings are unavailable', () => {
  for (const path of ['/admin', '/admin/configuracoes', '/admin/marketing']) {
    assert.equal(maintenanceDecision({ ...state, path, settingsError: true }), 'login');
  }
  assert.equal(maintenanceDecision({ ...state, path: '/admin', signedIn: true }), 'maintenance');
});
test('login, recovery, legal pages and payment confirmation stay reachable', () => {
  for (const path of ['/auth', '/auth/', '/auth/callback', '/~oauth/callback', '/pagamento-sucesso', '/privacidade', '/termos', '/regras', '/manutencao']) {
    assert.equal(maintenanceDecision({ ...state, path, authLoading: true, settingsError: true }), 'allow', path);
  }
  for (const path of ['/auth/unknown', '/administer', '/pagamento/123']) assert.equal(isMaintenanceExemptPath(path), false);
});

test('only complete gift tokens remain accessible during maintenance', () => {
  const path = '/presente/' + 'a1'.repeat(32);
  assert.equal(maintenanceDecision({ ...state, path }), 'allow');
  for (const invalid of ['/presentes', '/presentes/novo', '/presente/123', path + '/extra']) {
    assert.equal(isMaintenanceExemptPath(invalid), false);
  }
});
