const DAY = 86400000;
const allowedStatuses = new Set(['refreshed','retry_pending','refresh_failed','reconnect_required']);
const allowedErrors = new Set(['meta_auth_rejected','temporary_failure','provider_or_response_error']);
function refreshHealth(account, now = Date.now()) {
  const expiry = Date.parse(account.token_expires_at || account.expires_at);
  const stored = String(account.token_status || '').toLowerCase();
  let state = 'not_due';
  if (stored === 'disconnected') state = 'disconnected';
  else if (['expired','invalid','revoked','reconnect_required'].includes(stored) || (Number.isFinite(expiry) && expiry <= now)) state = 'reconnect_required';
  else if (account.auth_provider !== 'instagram') state = 'unsupported';
  else if (!Number.isFinite(expiry)) state = 'unknown';
  else if (['retry_pending','refresh_failed'].includes(account.token_refresh_status)) state = account.token_refresh_status;
  else if (expiry <= now + 15 * DAY) state = 'due_soon';
  return { state, lastRefreshedAt: account.token_refreshed_at || null, lastAttemptAt: account.token_refresh_checked_at || null,
    lastResult: allowedStatuses.has(account.token_refresh_status) ? account.token_refresh_status : null,
    errorCode: allowedErrors.has(account.token_refresh_error) ? account.token_refresh_error : null,
    refreshDueAt: Number.isFinite(expiry) && state !== 'unsupported' && state !== 'disconnected' ? new Date(expiry - 15 * DAY).toISOString() : null,
    // Date eligibility is observational; token presence/validity is checked only by the job.
  };
}
function monitorSnapshot(accounts, runs, { enabled = false, scheduled = false, unavailable = false } = {}, now = Date.now()) {
  const counts = { not_due:0, due_soon:0, retry_pending:0, refresh_failed:0, reconnect_required:0, disconnected:0, unsupported:0, unknown:0 };
  accounts.forEach(account => counts[refreshHealth(account,now).state]++);
  const safeRuns = runs.slice(0,10).map(run => ({ id:run.id, source:run.trigger_source === "admin" ? "admin" : "job", mode:run.mode, status:run.status, startedAt:run.started_at, finishedAt:run.finished_at,
    checked:run.checked, eligible:run.eligible, refreshed:run.refreshed, skipped:run.skipped, failed:run.failed }));
  const latest = safeRuns[0] || null;
  const latestApply = safeRuns.find(run=>run.mode==='apply' && run.source==='job') || null;
  const age = latestApply ? now-Date.parse(latestApply.startedAt) : Infinity;
  let status = 'not_scheduled';
  if (unavailable) status = 'unavailable';
  else if (latestApply?.status === 'running' && age > 30*60000) status = 'stalled';
  else if (latestApply?.status === 'failed') status = 'failed';
  else if (scheduled && (!latestApply || age > 26*3600000)) status = 'overdue';
  else if (!enabled) status = 'disabled';
  else if (scheduled && latestApply?.status === 'running') status = 'running';
  else if (scheduled && latestApply?.status === 'completed') status = 'recent_run';
  return { status, applyEnabled:enabled, scheduleExpected:scheduled, counts, latest, lastCompleted:safeRuns.find(run=>run.source==='job' && run.mode==='apply' && run.status==='completed') || null, recentRuns:safeRuns, unavailable };
}
async function loadTokenRefreshMonitor(db,accounts,now) {
  let runs=[], unavailable=false;
  try {
    const result=await db.from('instagram_token_refresh_runs').select('id,trigger_source,mode,status,started_at,finished_at,checked,eligible,refreshed,skipped,failed').order('started_at',{ascending:false}).range(0,9);
    if(result.error) unavailable=true; else runs=result.data||[];
  } catch { unavailable=true; }
  return monitorSnapshot(accounts,runs,{enabled:process.env.INSTAGRAM_TOKEN_REFRESH_ENABLED==='true',scheduled:process.env.INSTAGRAM_TOKEN_REFRESH_SCHEDULED==='true',unavailable},now);
}
module.exports={refreshHealth,monitorSnapshot,loadTokenRefreshMonitor};
