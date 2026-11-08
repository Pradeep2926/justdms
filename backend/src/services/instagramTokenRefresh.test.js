const test = require('node:test');
const assert = require('node:assert/strict');
const { runTokenRefresh, eligibility, safeFailure } = require('./instagramTokenRefresh.service');
const NOW = Date.parse('2026-11-08T00:00:00Z');
const fixture = () => ({ id: 'fixture-account', auth_provider: 'instagram', token_status: 'active', access_token: 'fixture-old-secret', connected_at: '2026-09-20T00:00:00Z', updated_at: '2026-11-07T00:00:00Z', expires_at: '2026-11-19T00:00:00Z', token_expires_at: '2026-11-19T00:00:00Z' });
function harness({ accounts = [fixture()], claim = true, remoteError, response, changed = false, saveError = false } = {}) {
  const calls = [], writes = [];
  const db = {
    from(table) { assert.equal(table, 'instagram_accounts'); return {
      select() { return { order() {return this;}, range() {return this;}, eq() {return this;}, then(resolve) {resolve({data:accounts});} }; },
      update(values) { const entry = { values, filters: [] }; writes.push(entry); return {
        eq(key,value) { entry.filters.push([key,value]); return this; },
        is(key,value) { entry.filters.push([key,value]); return this; },
        async select(fields) { assert.equal(fields,'id'); return {data: changed ? [] : [{id:accounts[0].id}],error:saveError ? Error('storage') : null}; },
      }; },
    }; },
    async rpc(name,args) { calls.push({name,args}); return {data:claim}; },
  };
  const http = { async get(url,options) { calls.push({url,options}); if(remoteError)throw remoteError; return {data:response || {access_token:'fixture-new-secret',expires_in:5184000}}; } };
  return { calls, writes, run: options=>runTokenRefresh({ db,http,now:()=>NOW,...options }) };
}
test('dry-run neither claims, contacts Meta, nor writes credentials', async()=>{
  const h=harness();const report=await h.run({});assert.equal(report.eligible,1);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);assert.ok(!JSON.stringify(report).includes('secret'));
});
test('apply is refused without explicit enable flag', async()=>{
  const h=harness();await assert.rejects(h.run({apply:true}),/disabled/);assert.equal(h.calls.length,0);
});
test('filters unsupported, invalid, expired, unknown, young and not-due tokens',()=>{
  for(const patch of [{auth_provider:'facebook'},{token_status:'disconnected'},{token_status:'reconnect_required'},{access_token:null},{token_expires_at:'invalid'},{token_expires_at:'2026-11-07'},{token_expires_at:'2026-12-01'},{connected_at:null},{connected_at:'2026-11-07T23:00:00Z'},{token_refreshed_at:'2026-11-07T23:00:00Z'}]) assert.ok(eligibility({...fixture(),...patch},NOW));
  assert.equal(eligibility(fixture(),NOW),null);
});
test('successful refresh uses Meta response expiry, preserves media sync and scopes writes to old token and lease', async()=>{
  const h=harness();const result=await h.run({apply:true,enabled:true});assert.equal(result.refreshed,1);
  assert.equal(h.calls[0].name,'claim_instagram_token_refresh');
  assert.equal(h.calls[1].url,'https://graph.instagram.com/refresh_access_token');
  assert.equal(h.calls[1].options.params.grant_type,'ig_refresh_token');assert.equal(h.calls[1].options.maxRedirects,0);
  const {values,filters}=h.writes[0];assert.equal(values.access_token,'fixture-new-secret');
  assert.equal(Date.parse(values.expires_at),NOW+5184000*1000);assert.equal(values.token_expires_at,values.expires_at);
  assert.equal(values.last_sync,undefined);assert.equal(values.page_access_token,undefined);
  assert.ok(filters.some(([key,value])=>key==='access_token'&&value==='fixture-old-secret'));
  assert.ok(filters.some(([key,value])=>key==='updated_at'&&value===fixture().updated_at));
  assert.ok(filters.some(([key,value])=>key==='token_refresh_lease_id'&&value===h.calls[0].args.p_lease_id));
  assert.ok(!JSON.stringify(result).includes('secret'));
});
test('another worker or changed credential prevents a remote refresh', async()=>{
  const h=harness({claim:false});const r=await h.run({apply:true,enabled:true});assert.equal(r.accounts[0].status,'busy_or_changed');assert.equal(h.calls.length,1);assert.equal(h.writes.length,0);
});
test('concurrent disconnect/reconnect cannot be reported or overwritten as refreshed', async()=>{
  const h=harness({changed:true});const r=await h.run({apply:true,enabled:true});assert.equal(r.refreshed,0);assert.equal(r.accounts[0].status,'changed_during_refresh');
});
test('temporary errors keep the existing token and active connection', async()=>{
  for(const remoteError of [{response:{status:429}},{response:{status:503}},{code:'ECONNABORTED'}]){
    const h=harness({remoteError});const r=await h.run({apply:true,enabled:true});assert.equal(r.failed,1);const v=h.writes[0].values;assert.equal(v.token_refresh_status,'retry_pending');assert.equal(v.access_token,undefined);assert.equal(v.token_status,undefined);assert.equal(v.expires_at,undefined);
  }
});
test('explicit authentication rejection flags only the matched account, without clearing token', async()=>{
  const h=harness({remoteError:{response:{status:400,data:{error:{code:190,message:'sensitive provider payload'}}}}});const r=await h.run({apply:true,enabled:true});assert.equal(r.failed,1);assert.equal(h.writes[0].values.token_status,'reconnect_required');assert.equal(h.writes[0].values.access_token,undefined);assert.ok(!JSON.stringify(h.writes).includes('sensitive provider payload'));
});
test('bad Meta response and storage failure never count as a renewal', async()=>{
  const h=harness({response:{access_token:'fixture-new-secret',expires_in:-1}});const r=await h.run({apply:true,enabled:true});assert.equal(r.failed,1);assert.equal(h.writes[0].values.access_token,undefined);
  const badSave=harness({saveError:true});assert.equal((await badSave.run({apply:true,enabled:true})).accounts[0].status,'save_failed');
});
test('unrelated API errors do not force reconnect',()=>{
  assert.equal(safeFailure({response:{data:{error:{code:100}}}}).status,'refresh_failed');
});
