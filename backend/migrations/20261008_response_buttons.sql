alter table automations
  add column if not exists resource_buttons jsonb default '[]'::jsonb;
