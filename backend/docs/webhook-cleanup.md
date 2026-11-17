# Webhook log retention

Applies only to `webhook_events`: both creation and processing must be older than 14 days. Allowlist: `webhook_receipt/processed`, `comments/ignored|skipped|replied`, and `messaging_trace/processed|skipped`. Keep all other types/statuses, NULL processing dates, failures and unresolved records. No DM logic, interactions, delivery history, Auth or token jobs are changed.

Install `20261117_webhook_cleanup.sql` (disabled), then the concurrent index migration outside a transaction. Review `select public.run_webhook_cleanup(true);`. Only after explicit retention approval apply the activation migration. Daily job is `justdms-webhook-cleanup`, UTC `0 22 * * *` (03:30 IST). Never enable the unrelated Instagram token renewal job as part of this rollout.

Each invocation takes a transaction advisory lock, skips locked candidate rows, removes at most ten 1,000-row batches, and records counts/cutoff/status. A deletion error rolls back all deletions in that invocation; the SQLSTATE is recorded without payloads. Scheduled invocations have a 60-second statement timeout; a cancellation is also visible in `cron.job_run_details`. Catch-up invocations use the same bounds and run sequentially. The recorded remaining count is a snapshot estimate (`eligible_before - deleted_rows`) while events may arrive concurrently.

Both maintenance tables have RLS and no anon/authenticated grants. Functions are SECURITY DEFINER with a fixed search path and executable only by postgres/service_role. Service role can read maintenance tables, but cannot edit settings directly. Admin monitoring uses the existing confirmed, allowlisted backend route and degrades to unavailable if telemetry cannot be read. Schedule configuration and manual success alone do not claim a successful scheduled run.

Pause: `update public.webhook_cleanup_settings set enabled=false where id=true;` and `select cron.alter_job((select jobid from cron.job where jobname='justdms-webhook-cleanup'), active:=false);`. Pausing does not restore removed logs. Re-enable only through the reviewed activation script. Do not replace with TRUNCATE or remove receipt persistence.

Normal PostgreSQL vacuuming makes deleted space reusable; physical database size may not fall immediately. Do not run VACUUM FULL on the live webhook table as routine cleanup: it takes an exclusive lock. Monitor retention backlog and job failures as traffic grows; the daily cap is 10,000 rows.

Validation: 135 backend tests and frontend build passed. An isolated `cleanup_retention_test` schema was created inside a rolled-back transaction: 1,002 eligible fixtures and eight protected records covered dry-run nonmutation, disabled guard, per-batch cap, recent creation/processing, NULL processing date, failed/received/matched/unknown states, and backend-only privileges. No production Auth fixtures were used. Production dry run found 90,628 eligible rows with zero removed before activation approval.
