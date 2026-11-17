-- Run only after the disabled migration, isolated tests, index, and dry-run review.
-- User explicitly approved the initial backlog and ongoing permanent retention cleanup.
create extension if not exists pg_cron;
begin;
update public.webhook_cleanup_settings set enabled=true where id=true;
-- pg_cron schedules use UTC here: 22:00 UTC = 03:30 IST the following day.
select cron.schedule('justdms-webhook-cleanup','0 22 * * *',
 $$set statement_timeout='60s'; select public.run_webhook_cleanup(false);$$);
commit;
