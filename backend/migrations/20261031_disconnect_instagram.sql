-- Apply before enabling the Disconnect action in production.
begin;
create or replace function public.disconnect_instagram_account(p_user_id uuid, p_user_email text, p_account_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare paused integer;
begin
  if not exists (select 1 from auth.users where id = p_user_id and lower(email) = lower(p_user_email)) then
    raise exception 'Account owner not found';
  end if;
  perform 1 from public.instagram_accounts where id = p_account_id and lower(user_email) = lower(p_user_email) for update;
  if not found then raise exception 'Instagram account not found'; end if;
  update public.automations set is_active = false where lower(user_email) = lower(p_user_email) and is_active = true;
  get diagnostics paused = row_count;
  update public.instagram_accounts set access_token = null, page_access_token = null, refresh_token = null,
    token_status = 'disconnected', webhook_enabled = false, updated_at = now()
    where id = p_account_id;
  return paused;
end;
$$;
revoke all on function public.disconnect_instagram_account(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.disconnect_instagram_account(uuid,text,uuid) to service_role;
commit;
