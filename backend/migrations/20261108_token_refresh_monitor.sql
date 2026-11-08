begin;
create table if not exists public.instagram_token_refresh_runs (
 id uuid primary key,
 mode text not null check (mode in ('dry_run','apply')),
 status text not null check (status in ('running','completed','failed')),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 checked integer not null default 0, eligible integer not null default 0,
 refreshed integer not null default 0, skipped integer not null default 0, failed integer not null default 0,
 trigger_source text not null default 'job' check (trigger_source in ('job','admin')),
 triggered_by uuid,
 error_code text
);
alter table public.instagram_token_refresh_runs
 add column if not exists trigger_source text not null default 'job',
 add column if not exists triggered_by uuid;
create index if not exists instagram_token_refresh_runs_started_idx on public.instagram_token_refresh_runs(started_at desc);
alter table public.instagram_token_refresh_runs enable row level security;
revoke all on public.instagram_token_refresh_runs from public,anon,authenticated;
grant select,insert,update on public.instagram_token_refresh_runs to service_role;
commit;
