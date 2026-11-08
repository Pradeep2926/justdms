const test=require('node:test');
const assert=require('node:assert/strict');
const {refreshAccountAsAdmin}=require('./adminTokenRefresh.service');
const {monitorSnapshot}=require('./tokenRefreshMonitor.service');
const accountId='11111111-1111-4111-8111-111111111111';
const admin={id:'admin-fixture',email:'admin@example.invalid',email_confirmed_at:'2026-11-08'};
function setup(){const calls=[];return {calls,db:{from(){return {async insert(row){calls.push(row);return {};},update(row){calls.push(row);return {async eq(){return {};}};}};}}};}
test('manual renewal requires verified allowed admin, confirmation and enabled writes',async()=>{
 const old=process.env.ADMIN_EMAILS;process.env.ADMIN_EMAILS=admin.email;
 try {
  for(const patch of [{admin:null},{confirmed:false},{enabled:false},{accountId:'bad'}]){
   let ran=false;await assert.rejects(refreshAccountAsAdmin({admin,accountId,confirmed:true,enabled:true,...patch,run:async()=>{ran=true;}}));assert.equal(ran,false);
  }
 }finally{if(old===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=old;}
});
test('ineligible account never contacts apply or records a fake successful run',async()=>{
 const old=process.env.ADMIN_EMAILS;process.env.ADMIN_EMAILS=admin.email;
 try {
  const h=setup();let n=0;const result=await refreshAccountAsAdmin({db:h.db,admin,accountId,confirmed:true,enabled:true,run:async options=>{n++;assert.equal(options.accountId,accountId);assert.equal(options.apply,undefined);return {checked:1,eligible:0,accounts:[{status:'expired'}]};}});
  assert.equal(result.status,'skipped');assert.equal(n,1);assert.equal(h.calls.length,0);
 }finally{if(old===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=old;}
});
test('eligible manual refresh is scoped, recorded against admin and cannot satisfy daily monitoring',async()=>{
 const old=process.env.ADMIN_EMAILS;process.env.ADMIN_EMAILS=admin.email;
 try {
  const h=setup();const result=await refreshAccountAsAdmin({db:h.db,admin,accountId,confirmed:true,enabled:true,run:async options=>{
   assert.equal(options.accountId,accountId);
   return options.apply?{checked:1,eligible:1,refreshed:1,failed:0,skipped:0,accounts:[{status:'refreshed'}]}:{checked:1,eligible:1};
  }});
  assert.equal(result.status,'refreshed');assert.equal(h.calls[0].trigger_source,'admin');assert.equal(h.calls[0].triggered_by,admin.id);
  const monitor=monitorSnapshot([],[{id:'manual',mode:'apply',trigger_source:'admin',status:'completed',started_at:new Date().toISOString()}],{enabled:true,scheduled:true});
  assert.equal(monitor.status,'overdue');assert.equal(monitor.lastCompleted,null);
 }finally{if(old===undefined)delete process.env.ADMIN_EMAILS;else process.env.ADMIN_EMAILS=old;}
});
