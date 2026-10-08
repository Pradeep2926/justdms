create extension if not exists btree_gist;

create table if not exists booking_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade unique,
  username text not null,
  display_name text,
  professional_title text,
  bio text,
  profile_picture_url text,
  timezone text not null default 'Asia/Kolkata',
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120),
  hold_minutes integer not null default 15 check (hold_minutes between 5 and 60),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$')
);
create unique index if not exists booking_profiles_username_lower_unique on booking_profiles (lower(username));

create table if not exists booking_services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references booking_profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text,
  duration_minutes integer not null check (duration_minutes in (15, 30, 45, 60)),
  price_paise integer not null default 0 check (price_paise >= 0),
  appointment_type text not null check (appointment_type in ('online', 'offline')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists booking_services_profile_idx on booking_services (profile_id, is_active);

create table if not exists booking_availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references booking_profiles(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_enabled boolean not null default true,
  constraint booking_availability_valid_window check (start_time < end_time),
  constraint booking_availability_unique unique (profile_id, weekday, start_time, end_time)
);

create table if not exists booking_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references booking_profiles(id) on delete cascade,
  blocked_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint booking_blocked_dates_unique unique (profile_id, blocked_date)
);

create table if not exists booking_payment_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references booking_profiles(id) on delete cascade unique,
  upi_enabled boolean not null default false,
  upi_id text,
  upi_display_name text,
  upi_qr_path text,
  razorpay_enabled boolean not null default false,
  razorpay_payment_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references booking_profiles(id) on delete cascade,
  service_id uuid not null references booking_services(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  amount_paise integer not null check (amount_paise >= 0),
  status text not null check (status in ('pending_payment','payment_review','pending_confirmation','confirmed','completed','cancelled','rejected','expired','no_show')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required','awaiting','submitted','verified','not_received','late_payment')),
  hold_expires_at timestamptz,
  lookup_token_hash text not null unique,
  creator_notes text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_time check (starts_at < ends_at)
);
create index if not exists bookings_profile_start_idx on bookings (profile_id, starts_at desc);
create index if not exists bookings_service_start_idx on bookings (service_id, starts_at);
alter table bookings drop constraint if exists bookings_prevent_overlap;
alter table bookings add constraint bookings_prevent_overlap exclude using gist (
  profile_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
) where (status in ('pending_payment','payment_review','pending_confirmation','confirmed'));

create table if not exists booking_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  payment_method text not null check (payment_method in ('upi','razorpay')),
  payment_reference text,
  screenshot_path text,
  submitted_at timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending','verified','not_received','late')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  creator_note text
);
create index if not exists booking_payment_submissions_booking_idx on booking_payment_submissions (booking_id, submitted_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-payment-proofs', 'booking-payment-proofs', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

alter table booking_profiles enable row level security;
alter table booking_services enable row level security;
alter table booking_availability enable row level security;
alter table booking_blocked_dates enable row level security;
alter table booking_payment_settings enable row level security;
alter table bookings enable row level security;
alter table booking_payment_submissions enable row level security;

create or replace function create_booking_hold(
  p_profile_id uuid, p_service_id uuid, p_customer_name text, p_customer_email text,
  p_customer_phone text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_amount_paise integer, p_status text, p_payment_status text,
  p_hold_expires_at timestamptz, p_lookup_token_hash text
) returns bookings language plpgsql security definer set search_path = public as $$
declare created bookings;
begin
  insert into bookings(profile_id, service_id, customer_name, customer_email, customer_phone,
    starts_at, ends_at, amount_paise, status, payment_status, hold_expires_at, lookup_token_hash)
  values (p_profile_id, p_service_id, left(trim(p_customer_name),120), lower(trim(p_customer_email)),
    nullif(left(trim(p_customer_phone),30),''), p_starts_at, p_ends_at, p_amount_paise,
    p_status, p_payment_status, p_hold_expires_at, p_lookup_token_hash)
  returning * into created;
  return created;
exception when exclusion_violation then
  raise exception using errcode = '23P01', message = 'This time slot is no longer available.';
end $$;

revoke all on function create_booking_hold(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function create_booking_hold(uuid,uuid,text,text,text,timestamptz,timestamptz,integer,text,text,timestamptz,text) to service_role;

do $$ begin
  create policy "booking profile owner or published read" on booking_profiles for select using (owner_id = auth.uid() or is_published);
  create policy "booking profile owner write" on booking_profiles for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "booking service owner or public read" on booking_services for select using (exists(select 1 from booking_profiles p where p.id=profile_id and (p.owner_id=auth.uid() or (p.is_published and is_active))));
  create policy "booking service owner write" on booking_services for all using (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid())) with check (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid()));
  create policy "booking availability owner or public read" on booking_availability for select using (exists(select 1 from booking_profiles p where p.id=profile_id and (p.owner_id=auth.uid() or p.is_published)));
  create policy "booking availability owner write" on booking_availability for all using (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid())) with check (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid()));
  create policy "booking blocked owner only" on booking_blocked_dates for all using (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid())) with check (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid()));
  create policy "booking payments owner only" on booking_payment_settings for all using (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid())) with check (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid()));
  create policy "bookings creator only" on bookings for select using (exists(select 1 from booking_profiles p where p.id=profile_id and p.owner_id=auth.uid()));
  create policy "payment submissions creator only" on booking_payment_submissions for select using (exists(select 1 from bookings b join booking_profiles p on p.id=b.profile_id where b.id=booking_id and p.owner_id=auth.uid()));
exception when duplicate_object then null; end $$;

drop policy if exists "booking proof creator read" on storage.objects;
create policy "booking proof creator read" on storage.objects for select using (
  bucket_id = 'booking-payment-proofs' and exists(
    select 1 from booking_payment_submissions s join bookings b on b.id=s.booking_id
    join booking_profiles p on p.id=b.profile_id
    where s.screenshot_path = name and p.owner_id=auth.uid()
  )
);
