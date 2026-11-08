const {isAdminUser}=require('../lib/adminAccess');
const {runTokenRefresh}=require('./instagramTokenRefresh.service');
const {runWithMonitoring}=require('./tokenRefreshRun.service');
async function refreshAccountAsAdmin({db,http,admin,accountId,confirmed,enabled=process.env.INSTAGRAM_TOKEN_REFRESH_ENABLED==='true',run=runTokenRefresh}) {
 if(!isAdminUser(admin)) throw Object.assign(new Error('Administrator access required.'),{status:403});
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId||'')) throw Object.assign(new Error('Invalid Instagram account.'),{status:400});
 if(confirmed!==true) throw Object.assign(new Error('Confirm this account refresh first.'),{status:400});
 if(!enabled) throw Object.assign(new Error('Token renewal is disabled on this backend.'),{status:409});
 const check=await run({db,http,accountId});
 if(!check.checked) throw Object.assign(new Error('Instagram account not found.'),{status:404});
 if(!check.eligible) return {status:'skipped',reason:check.accounts[0]?.status};
 const result=await runWithMonitoring({db,source:'admin',adminId:admin.id,run:()=>run({db,http,accountId,apply:true,enabled:true})});
 return {status:result.refreshed?'refreshed':result.failed?'failed':'skipped',reason:result.accounts[0]?.status};
}
module.exports={refreshAccountAsAdmin};
