alter table instagram_accounts
  add column if not exists auth_provider text default 'facebook';
