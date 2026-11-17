-- Installs disabled. Activation and scheduling are a separate, explicit step.
begin;
create table if not exists public.webhook_cleanup_settings (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 retention_days integer not null default 14 check(retention_days>=14),
 batch_size integer not null default 1000 check(batch_size between 1 and 1000),
 max_batches integer not null default 10 check(max_batches between 1 and 10)
);
insert into public.webhook_cleanup_settings(id) values(true) on conflict do nothing;
create table if not exists public.webhook_cleanup_runs (
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 cutoff_at timestamptz not null,
 mode text not null check(mode in ('dry_run','apply')),
 status text not null check(status in ('running','completed','failed','disabled')),
 eligible_before integer not null default 0,
 deleted_rows integer not null default 0,
 eligible_after integer not null default 0,
 error_code text
);
alter table public.webhook_cleanup_settings enable row level security;
alter table public.webhook_cleanup_runs enable row level security;
revoke all on public.webhook_cleanup_settings,public.webhook_cleanup_runs from public,anon,authenticated;
grant select on public.webhook_cleanup_settings,public.webhook_cleanup_runs to service_role;

create or replace function public.run_webhook_cleanup(p_dry_run boolean default true)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public set lock_timeout='250ms' as $$
declare
 config public.webhook_cleanup_settings%rowtype;
 run_id uuid; cutoff timestamptz; before_count integer; remaining integer;
 removed integer:=0; batch_count integer; batch_number integer;
begin
 if not pg_try_advisory_xact_lock(61117001) then return jsonb_build_object('status','already_running'); end if;
 select * into strict config from public.webhook_cleanup_settings where id=true;
 cutoff:=statement_timestamp()-make_interval(days=>config.retention_days);
 insert into public.webhook_cleanup_runs(cutoff_at,mode,status)
 values(cutoff,case when p_dry_run then 'dry_run' else 'apply' end,'running') returning id into run_id;
 if not p_dry_run and not config.enabled then
  update public.webhook_cleanup_runs set status='disabled',finished_at=clock_timestamp() where id=run_id;
  return jsonb_build_object('status','disabled','deleted_rows',0);
 end if;
 begin
  select count(*) into before_count from public.webhook_events
  where created_at<cutoff and processed_at<cutoff and
   ((event_type='webhook_receipt' and status='processed') or
    (event_type='comments' and status in ('ignored','skipped','replied')) or
    (event_type='messaging_trace' and status in ('processed','skipped')));
  if not p_dry_run then
   for batch_number in 1..config.max_batches loop
    with candidates as (
     select id from public.webhook_events
     where created_at<cutoff and processed_at<cutoff and
      ((event_type='webhook_receipt' and status='processed') or
       (event_type='comments' and status in ('ignored','skipped','replied')) or
       (event_type='messaging_trace' and status in ('processed','skipped')))
     order by created_at,id limit config.batch_size for update skip locked
    ), deleted as (
     delete from public.webhook_events w using candidates c where w.id=c.id returning w.id
    ) select count(*) into batch_count from deleted;
    removed:=removed+batch_count;
    exit when batch_count<config.batch_size;
   end loop;
  end if;
  remaining:=before_count-removed;
  update public.webhook_cleanup_runs set status='completed',finished_at=clock_timestamp(),
   eligible_before=before_count,deleted_rows=removed,eligible_after=remaining where id=run_id;
  return jsonb_build_object('status','completed','mode',case when p_dry_run then 'dry_run' else 'apply' end,
   'eligible_before',before_count,'deleted_rows',removed,'eligible_after',remaining,'run_id',run_id);
 exception when others then
  -- This subtransaction rolls back every deletion in a failed invocation.
  update public.webhook_cleanup_runs set status='failed',finished_at=clock_timestamp(),
   deleted_rows=0,error_code=sqlstate where id=run_id;
  return jsonb_build_object('status','failed','deleted_rows',0,'error_code',sqlstate);
 end;
end;
$$;
revoke all on function public.run_webhook_cleanup(boolean) from public,anon,authenticated;
grant execute on function public.run_webhook_cleanup(boolean) to service_role;

create or replace function public.get_webhook_cleanup_monitor()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare config jsonb; history jsonb; job jsonb:=null; scheduler_run jsonb:=null;
begin
 select to_jsonb(s)-'id' into config from public.webhook_cleanup_settings s where id=true;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.started_at desc),'[]'::jsonb) into history
 from(select * from public.webhook_cleanup_runs order by started_at desc limit 10) r;
 if to_regclass('cron.job') is not null then
  execute 'select jsonb_build_object(''active'',active,''schedule'',schedule) from cron.job where jobname=$1'
   into job using 'justdms-webhook-cleanup';
  if to_regclass('cron.job_run_details') is not null then
   execute 'select jsonb_build_object(''status'',r.status,''started_at'',r.start_time,''finished_at'',r.end_time)
    from cron.job_run_details r join cron.job j on j.jobid=r.jobid
    where j.jobname=$1 order by r.runid desc limit 1' into scheduler_run using 'justdms-webhook-cleanup';
  end if;
 end if;
 return jsonb_build_object('settings',config,'job',job,'schedulerRun',scheduler_run,'recentRuns',history);
end;
$$;
revoke all on function public.get_webhook_cleanup_monitor() from public,anon,authenticated;
grant execute on function public.get_webhook_cleanup_monitor() to service_role;
commit;
