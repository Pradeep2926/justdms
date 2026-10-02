create table if not exists instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  user_email text unique not null,
  auth_provider text default 'facebook',
  instagram_user_id text,
  instagram_account_id text,
  facebook_page_id text,
  page_id text,
  business_account_id text,
  username text,
  instagram_username text,
  name text,
  account_type text,
  profile_picture text,
  profile_picture_url text,
  followers integer,
  followers_count integer,
  following integer,
  follows_count integer,
  media_count integer,
  access_token text,
  page_access_token text,
  refresh_token text,
  expires_at timestamptz,
  token_expires_at timestamptz,
  token_status text,
  connected_at timestamptz default now(),
  last_sync timestamptz,
  webhook_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table instagram_accounts
  add column if not exists auth_provider text default 'facebook';

create table if not exists pending_meta_connections (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  access_token text not null,
  token_expires_in integer,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists pending_meta_connections_user_email_idx
  on pending_meta_connections(user_email);

create table if not exists instagram_media (
  id text primary key,
  account_id uuid references instagram_accounts(id) on delete cascade,
  caption text,
  media_type text,
  media_url text,
  thumbnail_url text,
  timestamp timestamptz,
  permalink text,
  like_count integer,
  comments_count integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists instagram_comments (
  id text primary key,
  account_id uuid references instagram_accounts(id) on delete cascade,
  media_id text references instagram_media(id) on delete cascade,
  text text,
  username text,
  timestamp timestamptz,
  like_count integer,
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  account_id uuid references instagram_accounts(id) on delete set null,
  media_id text,
  comment_id text,
  raw_payload jsonb,
  status text,
  message text,
  processed_at timestamptz,
  created_at timestamptz default now()
);

alter table webhook_events
  add column if not exists account_id uuid references instagram_accounts(id) on delete set null,
  add column if not exists status text,
  add column if not exists message text,
  add column if not exists processed_at timestamptz;

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  name text,
  user_id text not null,
  user_email text,
  media_id text references instagram_media(id) on delete cascade,
  trigger_type text default 'keyword',
  trigger_value text not null,
  message text not null,
  public_reply text,
  opening_dm_enabled boolean default true,
  opening_dm_message text,
  opening_dm_button_text text,
  follow_required boolean default false,
  not_following_message text,
  visit_profile_button_text text,
  confirm_follow_button_text text,
  still_not_following_message text,
  success_message text,
  resource_type text default 'link',
  resource_url text,
  resource_button_label text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table automations
  add column if not exists name text,
  add column if not exists user_email text,
  add column if not exists public_reply text,
  add column if not exists opening_dm_enabled boolean default true,
  add column if not exists opening_dm_message text,
  add column if not exists opening_dm_button_text text,
  add column if not exists follow_required boolean default false,
  add column if not exists not_following_message text,
  add column if not exists visit_profile_button_text text,
  add column if not exists confirm_follow_button_text text,
  add column if not exists still_not_following_message text,
  add column if not exists success_message text,
  add column if not exists resource_type text default 'link',
  add column if not exists resource_url text,
  add column if not exists resource_button_label text,
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now();

create table if not exists automation_interactions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid references automations(id) on delete cascade,
  connected_account_id uuid references instagram_accounts(id) on delete set null,
  instagram_sender_id text,
  instagram_username text,
  comment_id text,
  media_id text,
  current_step text,
  follow_status text default 'unknown',
  resource_delivery_status text default 'not_delivered',
  public_reply_sent_at timestamptz,
  opening_dm_sent_at timestamptz,
  resource_delivered_at timestamptz,
  raw_context jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists automation_interactions_comment_unique
  on automation_interactions(automation_id, comment_id)
  where comment_id is not null;

create unique index if not exists automation_interactions_sender_unique
  on automation_interactions(automation_id, instagram_sender_id)
  where instagram_sender_id is not null;

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid references automation_interactions(id) on delete set null,
  automation_id uuid references automations(id) on delete set null,
  connected_account_id uuid references instagram_accounts(id) on delete set null,
  instagram_sender_id text,
  comment_id text,
  media_id text,
  event_type text,
  direction text,
  status text,
  payload jsonb,
  error_message text,
  created_at timestamptz default now()
);
