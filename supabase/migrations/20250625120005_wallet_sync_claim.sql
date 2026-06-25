-- Claim atomique des jobs wallet_sync_jobs (anti double-traitement)

create or replace function public.claim_wallet_sync_jobs(p_limit integer default 20)
returns setof public.wallet_sync_jobs
language sql
security definer
set search_path = public
as $$
  update public.wallet_sync_jobs
  set locked_at = now()
  where id in (
    select j.id
    from public.wallet_sync_jobs j
    where j.processed_at is null
      and (j.locked_at is null or j.locked_at < now() - interval '5 minutes')
    order by j.created_at
    for update skip locked
    limit greatest(coalesce(p_limit, 20), 1)
  )
  returning *;
$$;

revoke all on function public.claim_wallet_sync_jobs(integer) from public;
grant execute on function public.claim_wallet_sync_jobs(integer) to service_role;
