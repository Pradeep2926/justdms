alter table automations
  add column if not exists retrigger_enabled boolean not null default false;
