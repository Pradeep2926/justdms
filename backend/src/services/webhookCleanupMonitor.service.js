function cleanupSnapshot(data, now = Date.now()) {
 const settings=data?.settings || {};
 const recentRuns=(data?.recentRuns || []).slice(0,10).map(row=>({
  startedAt:row.started_at,finishedAt:row.finished_at,mode:row.mode,status:row.status,
  eligibleBefore:row.eligible_before,deletedRows:row.deleted_rows,eligibleAfter:row.eligible_after,errorCode:row.error_code,
 }));
 const latest=recentRuns.find(row=>row.mode==='apply') || null;
 let status='disabled';
 if(settings.enabled) {
  if(!data.job?.active) status='not_scheduled';
  else if(latest?.status==='failed' || data.schedulerRun?.status==='failed') status='failed';
  else if(data.schedulerRun && now-Date.parse(data.schedulerRun.started_at)>26*3600000) status='overdue';
  else status=data.schedulerRun?.status==='succeeded'?'healthy':'scheduled';
 }
 return {status,retentionDays:settings.retention_days || 14,schedule:data?.job?.schedule || null,
  latest,lastSuccessful:recentRuns.find(row=>row.mode==='apply'&&row.status==='completed') || null,
  lastScheduledRun:data?.schedulerRun ? {status:data.schedulerRun.status,startedAt:data.schedulerRun.started_at,finishedAt:data.schedulerRun.finished_at}:null,recentRuns};
}
async function loadWebhookCleanupMonitor(db,now) {
 try {
  const {data,error}=await db.rpc('get_webhook_cleanup_monitor');
  if(error || !data?.settings) return {status:'unavailable'};
  return cleanupSnapshot(data,now);
 } catch {return {status:'unavailable'};}
}
module.exports={cleanupSnapshot,loadWebhookCleanupMonitor};
