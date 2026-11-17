-- Run outside a transaction. Concurrent build permits normal webhook writes.
create index concurrently if not exists webhook_events_cleanup_candidates_idx
on public.webhook_events(created_at,id)
where processed_at is not null and
 ((event_type='webhook_receipt' and status='processed') or
  (event_type='comments' and status in ('ignored','skipped','replied')) or
  (event_type='messaging_trace' and status in ('processed','skipped')));
