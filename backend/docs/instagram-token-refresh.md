# Instagram Login token renewal job

Status as of 8 November 2026: built locally; additive database migration installed and production dry-run completed. Job code is not deployed or scheduled. No real tokens have been refreshed.

## Scope and safeguards

This runs independently of the HTTP server and DM processing. Only `auth_provider = instagram` accounts are eligible. Valid tokens with a known expiry within 15 days, a known connection age of at least 24 hours, and no refresh in the last 24 hours can be renewed. Disconnected, expired and revoked connections are skipped. Facebook Login is excluded.

The default is read-only dry-run: no Meta request, lease claim or database update. Apply additionally requires `INSTAGRAM_TOKEN_REFRESH_ENABLED=true`. No public HTTP refresh endpoint is added.

The additive migration adds refresh diagnostics and a service-role-only lease function. A 30-minute per-account lease prevents simultaneous workers. One account is processed at a time; Meta calls time out after 20 seconds and do not follow redirects. Successful responses must contain a token and a plausible `expires_in`. The job calculates both expiry fields from the returned lifetime and updates `token_refreshed_at`; it does not update `last_sync`, automations, messages or media.

All writes match the original account ID, token, lease and `updated_at`. Concurrent sync, disconnect or reconnect takes priority: changed rows are not overwritten. A skipped save or database failure can leave the lease until it expires; a later run re-evaluates the account. A successful Meta refresh followed by a failed local save is reported as `save_failed`, never as completed. This requires investigation before retrying repeatedly.

Network/429/5xx failures preserve the existing token and connection status. A later scheduled run retries them. Explicit authentication errors (Meta 190/102) mark the still-matching connection `reconnect_required`; already expired/revoked tokens require interactive login. Other errors are recorded without invalidating account access. Results include account IDs and safe statuses only; never log tokens, full axios errors or provider payloads.

## Rollout order

1. Apply `backend/migrations/20261108_instagram_token_refresh.sql` after database integration review. Installation alone does not start renewal or modify saved credentials.
2. Deploy these files with scheduling still disabled. Give the job its own server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. It refuses local JSON mode. Never expose these values to the frontend.
3. From the backend working directory, run `npm run tokens:refresh -- --dry-run` and inspect candidate statuses. This needs the migration's additive columns installed.
4. Trial one internal connected account: set `INSTAGRAM_TOKEN_REFRESH_ENABLED=true` in the job's secret environment, then run `npm run tokens:refresh -- --apply --account=<account-uuid>`. Verify the expiry changed, existing automations stayed intact, and a real DM still works. Do not put credentials on the command line.
5. Only after the trial, enable a separate daily scheduler running `npm run tokens:refresh -- --apply`. For 3 AM India time, use `30 21 * * *` on a UTC scheduler. Do not use a timer in the sleeping Render web server.
6. Monitor exit status and JSON results. Errors set exit code 1; dry-run/apply output distinguishes refreshed, skipped, reconnect and failed accounts. Admin Overview reads these diagnostics and shows token renewal states and job heartbeat history.

Choose scheduler hosting at rollout time. The job should use the same backend source revision and dependencies, with secrets configured directly in the scheduler. No new paid service or schedule is created by this change.

To stop renewal: disable the scheduler and remove/set false `INSTAGRAM_TOKEN_REFRESH_ENABLED`. Allow an in-flight request to finish; existing DM processing does not depend on this job. Previously refreshed tokens stay valid and should not be reverted to older credentials.

## Verification

112 backend tests pass, including dry-run isolation, disabled writes, account filters, lease conflict, concurrent account changes, response validation, temporary failures, explicit auth failures and database save failure. Tests use synthetic credentials and an injected mock Meta client. Before production scheduling, validate SQL ownership/grants and overlapping lease behavior transactionally, then complete the single-account live trial above.

Meta reference: https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/
Meta documentation returned HTTP 429 during development; confirm current Instagram Login refresh requirements before enabling the first live trial.

## 8 November 2026 database validation and dry-run

The migration was first executed with synthetic account records inside a transaction that was rolled back. Checks passed for due-account claims, mismatched credentials, overlapping leases, expired lease recovery, disconnected/expired/not-due/Facebook/recently refreshed/newly connected exclusions, original update-version preservation, stale reconnect writes, and service-role-only execution privileges. The additive migration was then installed and its privileges verified (service role allowed; authenticated browser role denied). No customer credentials were modified.

Production dry-run, with writes explicitly disabled: 19 records checked; 15 not due, 3 reconnect/disconnected, 1 unsupported login provider; 0 eligible, 0 refreshed, 0 errors. These statuses use stored connection and expiry data, not live Meta token validation. No lease was claimed and no Meta call was made. No daily schedule was created.

Next: deploy with writes disabled when requested; retain the 15-day threshold. Perform the single internal-account live trial when an eligible account becomes available, or review a separate controlled early-trial option before changing the eligibility threshold. Do not classify disconnected or revoked connections as refresh candidates.

## Admin monitoring (local, pending deployment)

Apply `20261108_token_refresh_monitor.sql` before deploying the monitored job. The table has RLS and service-role-only read/write grants. Apply mode must persist a running heartbeat before contacting Meta; failed runs are recorded with a safe error code, and successful completion stores bounded summary counts. No token or provider payload is stored in job history. Dry-run remains entirely read-only and does not create a heartbeat.

Admin Overview shows account renewal due dates, last successful renewal, last attempt and safe status/error labels. Refresh warnings join the existing token-warning filter and attention list. A run-history read error is visible as monitoring unavailable and does not hide the rest of Admin Overview.

Web-backend `INSTAGRAM_TOKEN_REFRESH_ENABLED` reports its local apply gate. Set `INSTAGRAM_TOKEN_REFRESH_SCHEDULED=true` on the web backend only when the real external daily schedule is enabled; this is an operator declaration, not scheduler discovery. Configure the apply gate separately in the actual job environment. The UI explicitly distinguishes configuration from observed heartbeats. No successful run alone proves the external scheduler is still enabled. Expected apply jobs are overdue after 26 hours; a running job older than 30 minutes is flagged as potentially stalled. Dry-run records cannot satisfy daily freshness. The overview is a snapshot refreshed by the Admin Refresh button, not a background alerting service. No email notifications have been added. A confirmed administrator can request a single eligible-account renewal from the user detail drawer when the backend apply gate is enabled. The endpoint rechecks admin authorization, UUID, confirmation, eligibility and lease safeguards. Manual renewals are recorded with trigger_source=admin and the verified administrator ID, and never satisfy the daily-job heartbeat. Both manual and scheduled writes remain disabled until the controlled trial.

122 backend tests pass with account-status sanitization, secret isolation, heartbeat states and pre-run persistence coverage. Monitoring migration was applied on 8 November 2026 after a rolled-back fixture test validated row-level security, backend-only permissions, heartbeat updates and manual-admin attribution. The installed table had zero run records. No schedule or credential updates were enabled by this work.
