const { randomUUID } = require('node:crypto');
const DAY = 86400000;
const COLUMNS = 'id,auth_provider,token_status,access_token,expires_at,token_expires_at,connected_at,updated_at,token_refreshed_at';
const blocked = new Set(['expired', 'invalid', 'revoked', 'disconnected', 'reconnect_required']);
function eligibility(account, now) {
  if (account.auth_provider !== 'instagram') return 'unsupported_provider';
  if (blocked.has(account.token_status)) return 'reconnect_or_disconnected';
  if (!account.access_token) return 'missing_token';
  const expiry = Date.parse(account.token_expires_at || account.expires_at);
  if (!Number.isFinite(expiry)) return 'unknown_expiry';
  if (expiry <= now) return 'expired';
  if (expiry > now + 15 * DAY) return 'not_due';
  // Both account connection and any recorded refresh must be older than 24h.
  const connected = Date.parse(account.connected_at);
  if (!Number.isFinite(connected)) return 'unknown_token_age';
  const refreshed = account.token_refreshed_at ? Date.parse(account.token_refreshed_at) : connected;
  if (!Number.isFinite(refreshed) || Math.max(connected, refreshed) > now - DAY) return 'too_recent';
  return null;
}
function safeFailure(error) {
  const meta = error.response?.data?.error || {};
  const code = Number(meta.code);
  const status = Number(error.response?.status);
  if ([190, 102].includes(code)) return { status: 'reconnect_required', code: 'meta_auth_rejected' };
  if (status === 429 || status >= 500 || ['ECONNABORTED','ETIMEDOUT','ECONNRESET','ENOTFOUND','EAI_AGAIN'].includes(error.code)) return { status: 'retry_pending', code: 'temporary_failure' };
  return { status: 'refresh_failed', code: 'provider_or_response_error' };
}
async function runTokenRefresh({ db, http, apply = false, enabled = false, accountId, now = () => Date.now() }) {
  if (apply && !enabled) throw new Error('Token writes are disabled. Enable INSTAGRAM_TOKEN_REFRESH_ENABLED explicitly.');
  const summary = { mode: apply ? 'apply' : 'dry_run', checked: 0, eligible: 0, refreshed: 0, skipped: 0, failed: 0, accounts: [] };
  // Finish loading before any remote refresh: never process a partially loaded list.
  const accounts = [];
  for (let offset = 0; ; offset += 200) {
    let query = db.from('instagram_accounts').select(COLUMNS).order('id').range(offset, offset + 199);
    if (accountId) query = query.eq('id', accountId);
    const { data, error } = await query;
    if (error) throw new Error('Unable to load token refresh candidates.');
    accounts.push(...(data || []));
    if (!data || data.length < 200) break;
  }
  for (const account of accounts) {
    summary.checked++;
    const skip = eligibility(account, now());
    const outcome = { accountId: account.id, status: skip || 'eligible' };
    summary.accounts.push(outcome);
    if (skip) { summary.skipped++; continue; }
    summary.eligible++;
    if (!apply) continue;
    const leaseId = randomUUID();
    const { data: claimed, error: claimError } = await db.rpc('claim_instagram_token_refresh', { p_account_id: account.id, p_expected_token: account.access_token, p_lease_id: leaseId });
    if (claimError) throw new Error('Unable to claim token refresh; confirm the migration is installed.');
    if (!claimed) { outcome.status = 'busy_or_changed'; summary.skipped++; continue; }
    let updates;
    try {
      // Do not log axios errors: request configuration contains a credential.
      const { data } = await http.get('https://graph.instagram.com/refresh_access_token', {
        params: { grant_type: 'ig_refresh_token', access_token: account.access_token }, timeout: 20000, maxRedirects: 0,
      });
      const seconds = Number(data?.expires_in);
      if (typeof data?.access_token !== 'string' || !data.access_token || !Number.isFinite(seconds) || seconds <= DAY / 1000 || seconds > 366 * DAY / 1000) throw new Error('Invalid refresh response');
      const timestamp = new Date(now()).toISOString();
      const expiry = new Date(now() + seconds * 1000).toISOString();
      updates = { access_token: data.access_token, expires_at: expiry, token_expires_at: expiry, token_status: 'active', token_refreshed_at: timestamp, token_refresh_checked_at: timestamp, token_refresh_status: 'refreshed', token_refresh_error: null, token_refresh_lease_id: null, token_refresh_lease_until: null, updated_at: timestamp };
    } catch (error) {
      const failure = safeFailure(error);
      updates = { token_refresh_checked_at: new Date(now()).toISOString(), token_refresh_status: failure.status, token_refresh_error: failure.code, token_refresh_lease_id: null, token_refresh_lease_until: null,
        ...(failure.status === 'reconnect_required' ? { token_status: 'reconnect_required' } : {}) };
    }
    // A disconnect, reconnect or profile update during the Meta request wins.
    let save = db.from('instagram_accounts').update(updates).eq('id', account.id).eq('access_token', account.access_token).eq('token_refresh_lease_id', leaseId);
    save = account.updated_at ? save.eq('updated_at', account.updated_at) : save.is('updated_at', null);
    const { data: saved, error: saveError } = await save.select('id');
    if (saveError) { outcome.status = 'save_failed'; summary.failed++; continue; }
    if (!saved?.length) { outcome.status = 'changed_during_refresh'; summary.skipped++; continue; }
    outcome.status = updates.token_refresh_status;
    if (outcome.status === 'refreshed') summary.refreshed++; else summary.failed++;
  }
  return summary;
}
module.exports = { runTokenRefresh, eligibility, safeFailure };
