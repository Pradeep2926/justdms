const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness(user, rpcResult = { data: 2 }) {
  const routes = new Map(), calls = [];
  const router = { get() {}, post(path, handler) { routes.set(path, handler); } };
  vm.runInNewContext(fs.readFileSync(require.resolve('./instagram.routes'), 'utf8'), {
    module: { exports: {} }, console, process,
    require(name) {
      if (name === 'express') return { Router: () => router };
      if (name === '../lib/authClient') return { getAuthenticatedUser: async () => user };
      if (name === '../lib/supabase') return { rpc: async (name, args) => { calls.push({ name, args }); return rpcResult; } };
      return {};
    },
  });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  return { calls, res, run: body => routes.get('/disconnect')({ body }, res) };
}
const accountId = 'a17f9752-1224-4c0e-afb3-415aa348af74';
test('disconnect rejects unsigned requests before accessing storage', async () => {
  const h = harness(null); await h.run({ accountId });
  assert.equal(h.res.code, 401); assert.equal(h.calls.length, 0);
});
test('disconnect uses only verified identity and delegates ownership and pause to a single transaction', async () => {
  const h = harness({ id: 'verified-user', email: 'Owner@Example.com' });
  await h.run({ accountId, user_email: 'victim@example.com', user_id: 'victim' });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].name, 'disconnect_instagram_account');
  assert.equal(h.calls[0].args.p_user_id, 'verified-user');
  assert.equal(h.calls[0].args.p_user_email, 'owner@example.com');
  assert.equal(h.calls[0].args.p_account_id, accountId);
  assert.equal(h.res.body.pausedAutomations, 2);
});
test('database failure never claims an account was disconnected', async () => {
  const h = harness({ id: 'verified', email: 'owner@example.com' }, { error: new Error('Missing migration') });
  await h.run({ accountId }); assert.equal(h.res.code, 503); assert.equal(h.res.body.disconnected, undefined);
});
