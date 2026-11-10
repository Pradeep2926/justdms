begin;
create table if not exists public.welcome_emails (
 id uuid primary key references auth.users(id) on delete cascade,
 recipient text not null,
 display_name text,
 template_version text not null default 'v1',
 status text not null default 'pending' check(status in ('pending','sending','sent','retry','review')),
 attempts integer not null default 0,
 created_at timestamptz not null default now(),
 first_attempt_at timestamptz,
 next_attempt_at timestamptz not null default now(),
 lease_id uuid, lease_until timestamptz,
 accepted_at timestamptz, provider_message_id text, error_code text
);
create index if not exists welcome_emails_pending_idx on public.welcome_emails(next_attempt_at) where status in ('pending','retry','sending');
alter table public.welcome_emails enable row level security;
revoke all on public.welcome_emails from public,anon,authenticated;
grant select,insert,update on public.welcome_emails to service_role;
create or replace function public.enqueue_welcome_email() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.email is null or new.email_confirmed_at is null then return new; end if;
 if tg_op='UPDATE' then
  if old.email_confirmed_at is not null then return new; end if;
 end if;
 insert into public.welcome_emails(id,recipient,display_name)
 values(new.id,new.email,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'name',''),nullif(trim(concat_ws(' ',new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name')),'')),100))
 on conflict(id) do nothing;
 return new;
exception when others then
 -- Email infrastructure must never prevent signup or verification.
 raise log 'JustDMs welcome email enqueue failed; inspect onboarding email infrastructure';
 return new;
end;
$$;
revoke all on function public.enqueue_welcome_email() from public,anon,authenticated;
drop trigger if exists justdms_enqueue_welcome_email on auth.users;
create trigger justdms_enqueue_welcome_email after insert or update of email_confirmed_at on auth.users
 for each row execute function public.enqueue_welcome_email();
create or replace function public.claim_welcome_email(p_id uuid,p_lease_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare saved public.welcome_emails%rowtype;
begin
 select * into saved from public.welcome_emails where id=p_id for update;
 if not found or saved.status in ('sent','review') or saved.next_attempt_at>now() or saved.lease_until>now() then return null; end if;
 -- Never retry an uncertain send beyond Resend's 24h idempotency lifetime.
 if saved.first_attempt_at<now()-interval '23 hours' or saved.attempts>=10 then
  update public.welcome_emails set status='review',error_code='retry_window_ended' where id=p_id;
  return null;
 end if;
 update public.welcome_emails set status='sending',lease_id=p_lease_id,lease_until=now()+interval '5 minutes',
 first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1 where id=p_id returning * into saved;
 return to_jsonb(saved);
end;
$$;
revoke all on function public.claim_welcome_email(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_welcome_email(uuid,uuid) to service_role;
commit;
