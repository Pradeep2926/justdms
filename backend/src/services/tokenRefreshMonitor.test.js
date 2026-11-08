const test=require('node:test');
const assert=require('node:assert/strict');
const {refreshHealth,monitorSnapshot,loadTokenRefreshMonitor}=require('./tokenRefreshMonitor.service');
const {runWithMonitoring}=require('./tokenRefreshRun.service');
const now=Date.parse('2026-11-08T12:00:00Z');
const account={auth_provider:'instagram',token_status:'active',token_expires_at:'2026-11-20',token_refresh_status:'retry_pending',token_refresh_error:'temporary_failure',access_token:'PRIVATE_TOKEN'};
test('renewal account states prioritize disconnected and reconnect and sanitize error details',()=>{
 assert.equal(refreshHealth(account,now).state,'retry_pending');
 assert.equal(refreshHealth({...account,token_status:'disconnected'},now).state,'disconnected');
 assert.equal(refreshHealth({...account,token_status:'reconnect_required'},now).state,'reconnect_required');
 assert.equal(refreshHealth({...account,auth_provider:'facebook'},now).state,'unsupported');
 assert.equal(refreshHealth({...account,token_refresh_status:null},now).state,'due_soon');
 const result=refreshHealth({...account,token_refresh_error:'PRIVATE_PROVIDER_ERROR'},now);
 assert.equal(result.errorCode,null);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
});
test('dry runs and configuration alone cannot report scheduler health',()=>{
 const dry={id:'d',mode:'dry_run',status:'completed',started_at:new Date(now).toISOString()};
 assert.equal(monitorSnapshot([],[],{},now).status,'disabled');
 assert.equal(monitorSnapshot([],[dry],{enabled:true,scheduled:true},now).status,'overdue');
 assert.equal(monitorSnapshot([],[],{enabled:true},now).status,'not_scheduled');
 assert.equal(monitorSnapshot([],[],{unavailable:true},now).status,'unavailable');
});
test('heartbeat distinguishes healthy, overdue, failed and stalled apply runs',()=>{
 const run={id:'r',mode:'apply',status:'completed',started_at:new Date(now-3600000).toISOString(),raw_error:'PRIVATE'};
 const config={enabled:true,scheduled:true};
 assert.equal(monitorSnapshot([],[run],config,now).status,'recent_run');
 assert.equal(monitorSnapshot([],[{...run,started_at:new Date(now-27*3600000).toISOString()}],config,now).status,'overdue');
 assert.equal(monitorSnapshot([],[{...run,status:'running'}],config,now).status,'stalled');
 assert.equal(monitorSnapshot([],[{...run,status:'failed'}],config,now).status,'failed');
 assert.equal(JSON.stringify(monitorSnapshot([account],[run],config,now)).includes('PRIVATE'),false);
});
test('missing job history fails visibly without crashing the admin overview',async()=>{
 const result=await loadTokenRefreshMonitor({from(){throw Error('missing table');}},[],now);
 assert.equal(result.status,'unavailable');assert.equal(result.unavailable,true);
});
function harness(failInsert=false){
 const writes=[];const db={from(table){assert.equal(table,'instagram_token_refresh_runs');return {
  async insert(row){writes.push(row);return {error:failInsert?Error('db'):null};},
  update(row){writes.push(row);return {async eq(){return {error:null};}};}
 };}};return {db,writes};
}
test('apply cannot run unless its start heartbeat is persisted',async()=>{
 const h=harness(true);let called=false;
 await assert.rejects(runWithMonitoring({db:h.db,run:async()=>{called=true;}}));assert.equal(called,false);
});
test('apply stores bounded counts, and records unexpected failures without secrets',async()=>{
 const h=harness();const result={checked:1,eligible:1,refreshed:1,skipped:0,failed:0,accounts:[{secret:'PRIVATE'}]};
 await runWithMonitoring({db:h.db,run:async()=>result});
 assert.equal(h.writes[0].status,'running');assert.equal(h.writes[1].status,'completed');assert.equal(h.writes[1].refreshed,1);assert.equal(JSON.stringify(h.writes).includes('PRIVATE'),false);
 const failed=harness();await assert.rejects(runWithMonitoring({db:failed.db,run:async()=>{throw Error('PRIVATE_TOKEN');}}));
 assert.equal(failed.writes[1].status,'failed');assert.equal(failed.writes[1].error_code,'job_failed');assert.equal(JSON.stringify(failed.writes).includes('PRIVATE'),false);
});
