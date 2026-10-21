alter table public.subscriptions
  add column if not exists referral_access_end timestamptz;

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_codes_code_format check (code ~ '^[A-Z0-9]{6,20}$'),
  constraint referral_codes_owner_unique unique (owner_user_id),
  constraint referral_codes_code_unique unique (code)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  referrer_user_id uuid not null references auth.users(id) on delete restrict,
  referrer_email text not null,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  referred_email text not null,
  status text not null default 'signed_up'
    check (status in ('signed_up', 'qualified', 'rewarded', 'rejected')),
  qualifying_payment_id text,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_one_referrer_per_customer unique (referred_user_id),
  constraint referrals_no_self_referral check (referrer_user_id <> referred_user_id)
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.referrals(id) on delete restrict,
  recipient_user_id uuid not null references auth.users(id) on delete restrict,
  recipient_email text not null,
  payment_id text not null unique,
  reward_days integer not null default 14 check (reward_days = 14),
  access_ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_events (
  id bigint generated always as identity primary key,
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  event_type text not null check (event_type in ('visit')),
  visitor_hash text,
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_created_idx
  on public.referrals (referrer_user_id, created_at desc);
create index if not exists referrals_status_idx on public.referrals (status);
create index if not exists referral_events_code_created_idx
  on public.referral_events (referral_code_id, created_at desc);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.referral_events enable row level security;

-- Referral data is intentionally accessed only through authenticated backend routes.
-- The backend uses the service role; no direct browser policies are created.

create or replace function public.grant_referral_reward(
  p_referred_user_id uuid,
  p_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  referral_row public.referrals%rowtype;
  subscription_row public.subscriptions%rowtype;
  next_access_end timestamptz;
begin
  if p_payment_id is null or length(trim(p_payment_id)) = 0 then
    return jsonb_build_object('rewarded', false, 'reason', 'missing_payment');
  end if;

  select * into referral_row
  from public.referrals
  where referred_user_id = p_referred_user_id
  for update;

  if not found then
    return jsonb_build_object('rewarded', false, 'reason', 'no_referral');
  end if;

  if referral_row.status = 'rewarded'
     or exists (select 1 from public.referral_rewards where payment_id = p_payment_id) then
    return jsonb_build_object('rewarded', false, 'reason', 'already_rewarded');
  end if;

  select * into subscription_row
  from public.subscriptions
  where user_email = referral_row.referrer_email
  for update;

  next_access_end := greatest(
    now(),
    coalesce(subscription_row.referral_access_end, now())
  ) + interval '14 days';

  if subscription_row.id is null then
    insert into public.subscriptions (
      user_id, user_email, plan, status, referral_access_end, updated_at
    ) values (
      referral_row.referrer_user_id::text,
      referral_row.referrer_email,
      'pro',
      'inactive',
      next_access_end,
      now()
    );
  else
    update public.subscriptions
    set referral_access_end = next_access_end, updated_at = now()
    where id = subscription_row.id;
  end if;

  insert into public.referral_rewards (
    referral_id, recipient_user_id, recipient_email, payment_id,
    reward_days, access_ends_at
  ) values (
    referral_row.id, referral_row.referrer_user_id,
    referral_row.referrer_email, p_payment_id, 14, next_access_end
  );

  update public.referrals
  set status = 'rewarded', qualifying_payment_id = p_payment_id,
      qualified_at = now(), rewarded_at = now(), updated_at = now()
  where id = referral_row.id;

  return jsonb_build_object(
    'rewarded', true,
    'referrer_user_id', referral_row.referrer_user_id,
    'access_ends_at', next_access_end
  );
end;
$$;

revoke all on function public.grant_referral_reward(uuid, text) from public, anon, authenticated;
grant execute on function public.grant_referral_reward(uuid, text) to service_role;
