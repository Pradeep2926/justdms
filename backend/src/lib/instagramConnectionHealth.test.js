const test = require('node:test');
const assert = require('node:assert/strict');
const { needsReconnect, recordInvalidToken } = require('./instagramConnectionHealth');
test('expired and revoked connections require reconnect; valid ones do not', () => {
  const now = Date.parse('2026-10-26');
  assert.equal(needsReconnect({token_status:'active', expires_at:'2026-10-25'}, now), true);
  assert.equal(needsReconnect({token_status:'reconnect_required', expires_at:'2026-12-25'}, now), true);
  assert.equal(needsReconnect({token_status:'active', expires_at:'2026-12-25'}, now), false);
});
test('only authentication errors mark matching credentials and account', async () => {
  const writes = [];
  const db = {from(table) { return {update(value) { const entry = {table,value,filters:[]}; writes.push(entry); return {eq(key,value) {entry.filters.push([key,value]); return this;}, then(resolve) {resolve({error:null});}};}};}};
  for (const code of [10,100,429,500]) await recordInvalidToken(db,{response:{data:{error:{code}}}},'old','account');
  assert.equal(writes.length,0);
  await recordInvalidToken(db,{response:{data:{error:{code:190}}}},'old','account');
  assert.equal(writes.length,2);
  assert.deepEqual(writes[0].filters,[['access_token','old'],['id','account']]);
  assert.deepEqual(writes[1].filters,[['page_access_token','old'],['id','account']]);
});
test('status persistence failure does not throw into the sending flow', async () => {
  await assert.doesNotReject(recordInvalidToken({from(){throw Error('offline');}}, {response:{data:{error:{code:190}}}},'old'));
});
