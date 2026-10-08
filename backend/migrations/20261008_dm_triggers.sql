alter table instagram_accounts
  add column if not exists messaging_owner_id text;

alter table automations
  add column if not exists trigger_match_type text default 'exact';
