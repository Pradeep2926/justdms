const { randomUUID } = require('node:crypto');
async function runWithMonitoring({ db, run, source = "job", adminId = null }) {
  const id=randomUUID();
  const {error}=await db.from('instagram_token_refresh_runs').insert({id,mode:'apply',trigger_source:source,triggered_by:adminId,status:'running',started_at:new Date().toISOString()});
  if(error) throw new Error('Unable to start refresh monitoring. Apply is stopped before contacting Meta.');
  try {
    const result=await run();
    const {error:saveError}=await db.from('instagram_token_refresh_runs').update({status:result.failed?'failed':'completed',finished_at:new Date().toISOString(),checked:result.checked,eligible:result.eligible,refreshed:result.refreshed,skipped:result.skipped,failed:result.failed}).eq('id',id);
    if(saveError) throw new Error('Unable to finish refresh monitoring.');
    return result;
  } catch(error) {
    await db.from('instagram_token_refresh_runs').update({status:'failed',finished_at:new Date().toISOString(),error_code:'job_failed'}).eq('id',id);
    throw error;
  }
}
module.exports={runWithMonitoring};
