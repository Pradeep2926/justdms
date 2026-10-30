const test = require('node:test');
const assert = require('node:assert/strict');
const { grantProMonth } = require('./adminGrant.service');
const userId = '44bc587e-0209-4224-9abd-0b0f4a44da3a';
const requestId = '77bc587e-0209-4224-9abd-0b0f4a44da3a';
const admin = { id: 'admin', email: 'ADMIN@example.com' };
test('rejects invalid identities before accessing storage', async () => {
  await assert.rejects(grantProMonth({}, { userId: 'bad', requestId, admin }), { status: 400 });
});
test('cannot grant to missing registered account', async () => {
  const db = { auth: { admin: { getUserById: async () => ({ error: true }) } } };
  await assert.rejects(grantProMonth(db, { userId, requestId, admin }), { status: 404 });
});
test('uses authenticated identities and only the transactional grant RPC', async () => {
  let args;
  const db = {
    auth: { admin: { getUserById: async id => { assert.equal(id, userId); return { data: { user: { email: 'CUSTOMER@example.com' } } }; } } },
    rpc: async (name, payload) => { assert.equal(name, 'grant_admin_pro_month'); args = payload; return { data: '2026-11-30T00:00:00Z' }; },
  };
  const result = await grantProMonth(db, { userId, requestId, admin });
  assert.equal(args.p_user_email, 'customer@example.com');
  assert.equal(args.p_admin_email, 'admin@example.com');
  assert.equal(args.p_request_id, requestId);
  assert.equal(result.accessEnd, '2026-11-30T00:00:00Z');
});
