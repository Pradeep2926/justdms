-- Apply before deploying the admin Pro grant endpoint.
begin;
create table if not exists public.admin_pro_grants (
  request_id uuid primary key,
  user_id uuid not null,
  user_email text not null,
  admin_id uuid not null,
  admin_email text not null,
  previous_access_end timestamptz,
  access_end timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.admin_pro_grants enable row level security;
revoke all on public.admin_pro_grants from anon, authenticated;

create or replace function public.grant_admin_pro_month(
  p_request_id uuid, p_user_id uuid, p_user_email text,
  p_admin_id uuid, p_admin_email text
) returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  saved public.admin_pro_grants%rowtype;
  subscription public.subscriptions%rowtype;
  base_date timestamptz := now();
  new_end timestamptz;
begin
  -- Serialize all grants for one user, including concurrent admin requests.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into saved from public.admin_pro_grants where request_id = p_request_id;
  if found then
    if saved.user_id <> p_user_id or saved.admin_id <> p_admin_id then
      raise exception 'Grant request already belongs to another user or administrator';
    end if;
    return saved.access_end;
  end if;
  if not exists (select 1 from auth.users where id = p_user_id and lower(email) = lower(p_user_email)) then
    raise exception 'Registered account not found';
  end if;
  select * into subscription from public.subscriptions where user_email = lower(p_user_email) for update;
  if found then
    if subscription.user_id <> p_user_id::text then
      raise exception 'Subscription owner mismatch';
    end if;
    base_date := greatest(base_date, subscription.referral_access_end);
    if subscription.status = 'active' then
      if coalesce(subscription.ends_at, subscription.current_end) is null then
        raise exception 'Account already has Pro without an expiry';
      end if;
      base_date := greatest(base_date, coalesce(subscription.ends_at, subscription.current_end));
    end if;
    new_end := base_date + interval '1 month';
    update public.subscriptions set referral_access_end = new_end, updated_at = now()
      where id = subscription.id;
  else
    new_end := base_date + interval '1 month';
    insert into public.subscriptions(user_id, user_email, plan, status, referral_access_end, updated_at)
      values(p_user_id::text, lower(p_user_email), 'pro', 'inactive', new_end, now());
  end if;
  insert into public.admin_pro_grants(request_id, user_id, user_email, admin_id, admin_email, previous_access_end, access_end)
    values(p_request_id, p_user_id, lower(p_user_email), p_admin_id, lower(p_admin_email), base_date, new_end);
  return new_end;
end;
$$;
revoke all on function public.grant_admin_pro_month(uuid, uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.grant_admin_pro_month(uuid, uuid, text, uuid, text) to service_role;

commit;
