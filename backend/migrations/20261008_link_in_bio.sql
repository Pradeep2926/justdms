create table if not exists bio_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  description text,
  profile_picture_url text,
  theme text not null default 'justdms' check (theme in ('justdms', 'midnight', 'sunrise', 'minimal', 'forest')),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bio_profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  constraint bio_profiles_owner_unique unique (owner_id)
);

create unique index if not exists bio_profiles_username_lower_unique
  on bio_profiles (lower(username));
create index if not exists bio_profiles_public_lookup_idx
  on bio_profiles (lower(username), is_published);

create table if not exists bio_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references bio_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  url text not null check (char_length(url) between 8 and 2048),
  position integer not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bio_links_profile_position_unique unique (profile_id, position)
);

create index if not exists bio_links_public_idx
  on bio_links (profile_id, is_active, position);

create table if not exists bio_visits (
  id bigint generated always as identity primary key,
  profile_id uuid not null references bio_profiles(id) on delete cascade,
  visitor_hash text,
  user_agent text,
  referrer text,
  visited_at timestamptz not null default now()
);

create index if not exists bio_visits_profile_date_idx
  on bio_visits (profile_id, visited_at desc);

create table if not exists bio_clicks (
  id bigint generated always as identity primary key,
  profile_id uuid not null references bio_profiles(id) on delete cascade,
  link_id uuid not null references bio_links(id) on delete cascade,
  visitor_hash text,
  user_agent text,
  referrer text,
  clicked_at timestamptz not null default now()
);

create index if not exists bio_clicks_profile_date_idx
  on bio_clicks (profile_id, clicked_at desc);
create index if not exists bio_clicks_link_date_idx
  on bio_clicks (link_id, clicked_at desc);

alter table bio_profiles enable row level security;
alter table bio_links enable row level security;
alter table bio_visits enable row level security;
alter table bio_clicks enable row level security;

drop policy if exists "bio profile owner read" on bio_profiles;
create policy "bio profile owner read" on bio_profiles for select
  using (auth.uid() = owner_id or is_published = true);
drop policy if exists "bio profile owner insert" on bio_profiles;
create policy "bio profile owner insert" on bio_profiles for insert
  with check (auth.uid() = owner_id);
drop policy if exists "bio profile owner update" on bio_profiles;
create policy "bio profile owner update" on bio_profiles for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "bio profile owner delete" on bio_profiles;
create policy "bio profile owner delete" on bio_profiles for delete
  using (auth.uid() = owner_id);

drop policy if exists "bio links owner or public read" on bio_links;
create policy "bio links owner or public read" on bio_links for select using (
  exists (
    select 1 from bio_profiles p
    where p.id = profile_id
      and (p.owner_id = auth.uid() or (p.is_published = true and is_active = true))
  )
);
drop policy if exists "bio links owner insert" on bio_links;
create policy "bio links owner insert" on bio_links for insert with check (
  exists (select 1 from bio_profiles p where p.id = profile_id and p.owner_id = auth.uid())
);
drop policy if exists "bio links owner update" on bio_links;
create policy "bio links owner update" on bio_links for update using (
  exists (select 1 from bio_profiles p where p.id = profile_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from bio_profiles p where p.id = profile_id and p.owner_id = auth.uid())
);
drop policy if exists "bio links owner delete" on bio_links;
create policy "bio links owner delete" on bio_links for delete using (
  exists (select 1 from bio_profiles p where p.id = profile_id and p.owner_id = auth.uid())
);

drop policy if exists "bio visits owner read" on bio_visits;
create policy "bio visits owner read" on bio_visits for select using (
  exists (select 1 from bio_profiles p where p.id = profile_id and p.owner_id = auth.uid())
);
drop policy if exists "bio clicks owner read" on bio_clicks;
create policy "bio clicks owner read" on bio_clicks for select using (
  exists (select 1 from bio_profiles p where p.id = profile_id and p.owner_id = auth.uid())
);
