const test=require('node:test');
const assert=require('node:assert/strict');
const {cleanupSnapshot,loadWebhookCleanupMonitor}=require('./webhookCleanupMonitor.service');
const now=Date.parse('2026-11-17T10:00:00Z');
const fixture={settings:{enabled:true,retention_days:14},job:{active:true,schedule:'0 22 * * *'},schedulerRun:{status:'succeeded',started_at:'2026-11-16T22:00:00Z'},recentRuns:[{mode:'apply',status:'completed',started_at:'2026-11-16T22:00:00Z',deleted_rows:1000,eligible_after:0,raw_payload:'PRIVATE'}]};
test('cleanup health requires an actual schedule and recent apply; raw fields stay private',()=>{
 assert.equal(cleanupSnapshot(fixture,now).status,'healthy');
 assert.equal(cleanupSnapshot({...fixture,job:null},now).status,'not_scheduled');
 assert.equal(cleanupSnapshot(fixture,now+86400000).status,'overdue');
 assert.equal(JSON.stringify(cleanupSnapshot(fixture,now)).includes('PRIVATE'),false);
 assert.equal(cleanupSnapshot({...fixture,schedulerRun:{status:'failed'}},now).status,'failed');
 assert.equal(cleanupSnapshot({...fixture,recentRuns:[{...fixture.recentRuns[0],status:'failed'}]},now).status,'failed');
 assert.equal(cleanupSnapshot({...fixture,schedulerRun:null},now).status,'scheduled');
});
test('missing migrations and storage failures cannot break admin overview',async()=>{
 for(const db of [{},{rpc:async()=>({error:{message:'missing'}})},{rpc:async()=>{throw Error('offline');}}])
  assert.deepEqual(await loadWebhookCleanupMonitor(db,now),{status:'unavailable'});
});
