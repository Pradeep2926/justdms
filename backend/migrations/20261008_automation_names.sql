alter table automations
  add column if not exists name text;

update automations
set name = nullif(trim(trigger_value), '')
where name is null
  and trigger_value is not null
  and trigger_value <> '*';
