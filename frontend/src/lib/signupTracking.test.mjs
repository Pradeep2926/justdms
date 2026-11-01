import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewVerifiedSignup } from './signupTracking.mjs';
const now = Date.parse('2026-11-01T10:00:00Z');
const intent = { startedAt: now - 60000, userId: 'new' };
const user = { id: 'new', created_at: new Date(now - 30000).toISOString(), email_confirmed_at: new Date(now).toISOString() };
test('only a new confirmed signup qualifies', () => {
  assert.equal(isNewVerifiedSignup(user, intent, now), true);
  assert.equal(isNewVerifiedSignup({ ...user, email_confirmed_at: null }, intent, now), false);
  assert.equal(isNewVerifiedSignup({ ...user, created_at: new Date(now - 86400000).toISOString() }, intent, now), false);
  assert.equal(isNewVerifiedSignup({ ...user, id: 'other' }, intent, now), false);
  assert.equal(isNewVerifiedSignup(user, null, now), false);
  assert.equal(isNewVerifiedSignup(user, { ...intent, startedAt: now - 86400001 }, now), false);
});
