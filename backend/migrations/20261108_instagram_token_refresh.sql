-- Additive only; installing does not refresh tokens or start a scheduler.
begin;
alter table public.instagram_accounts
  add column if not exists token_refreshed_at timestamptz,
  add column if not exists token_refresh_checked_at timestamptz,
  add column if not exists token_refresh_status text,
  add column if not exists token_refresh_error text,
  add column if not exists token_refresh_lease_id uuid,
  add column if not exists token_refresh_lease_until timestamptz;
create or replace function public.claim_instagram_token_refresh(p_account_id uuid,p_expected_token text,p_lease_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.instagram_accounts set token_refresh_lease_id=p_lease_id, token_refresh_lease_until=now()+interval '30 minutes'
  where id=p_account_id and access_token=p_expected_token and auth_provider='instagram'
    and coalesce(token_status,'') not in ('expired','invalid','revoked','disconnected','reconnect_required')
    and coalesce(token_expires_at,expires_at)>now()
    and coalesce(token_expires_at,expires_at)<=now()+interval '15 days'
    and connected_at<=now()-interval '24 hours'
    and (token_refreshed_at is null or token_refreshed_at<=now()-interval '24 hours')
    and (token_refresh_lease_until is null or token_refresh_lease_until<now());
  return found;
end;
$$;
revoke all on function public.claim_instagram_token_refresh(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_instagram_token_refresh(uuid,text,uuid) to service_role;
commit;
