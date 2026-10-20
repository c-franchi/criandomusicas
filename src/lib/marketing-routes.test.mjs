import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
const expect = value => ({ toBe: expected => assert.equal(value, expected), toBeNull: () => assert.equal(value, null) });
import { getLegacyCreatorDestination, safeAuthDestination } from './marketing-routes.ts';

describe('campaign compatibility', () => {
  test('home creator anchor reaches dedicated page', () => {
    expect(getLegacyCreatorDestination('/', '#criadores')).toBe('/criadores');
  });
  test('old plans creator anchor preserves campaign query', () => {
    expect(getLegacyCreatorDestination('/planos', '#creator', '?utm_source=facebook')).toBe('/criadores?utm_source=facebook');
  });
  test('ordinary package visitors are not redirected', () => {
    expect(getLegacyCreatorDestination('/planos', '')).toBeNull();
    expect(getLegacyCreatorDestination('/', '#planos')).toBeNull();
  });
  test('selected recurring plan survives sign-in', () => {
    expect(safeAuthDestination('/creator-checkout/creator_pro')).toBe('/creator-checkout/creator_pro');
  });
  test('external and auth-loop redirects are rejected', () => {
    expect(safeAuthDestination('//example.com')).toBe('/');
    expect(safeAuthDestination('/\\example.com')).toBe('/');
    expect(safeAuthDestination('/auth')).toBe('/');
  });
});