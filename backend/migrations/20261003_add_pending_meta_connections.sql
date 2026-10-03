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

alter table instagram_accounts
  add column if not exists auth_provider text default 'facebook';
