-- Phase 6 — Logs sync Wallet + retries jobs

-- ---------------------------------------------------------------------------
-- 1. wallet_sync_logs
-- ---------------------------------------------------------------------------

create table if not exists public.wallet_sync_logs (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.customer_memberships(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null check (source in ('instant', 'worker', 'manual')),
  status text not null check (status in ('success', 'partial', 'failed', 'skipped')),
  google_synced boolean not null default false,
  apple_synced boolean not null default false,
  google_error text,
  apple_error text,
  apple_push_tokens integer not null default 0,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_sync_logs_membership_idx
  on public.wallet_sync_logs (membership_id, created_at desc);

create index if not exists wallet_sync_logs_business_idx
  on public.wallet_sync_logs (business_id, created_at desc);

alter table public.wallet_sync_logs enable row level security;

drop policy if exists "wallet_sync_logs_select_member" on public.wallet_sync_logs;
create policy "wallet_sync_logs_select_member"
  on public.wallet_sync_logs
  for select
  using (public.is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- 2. wallet_sync_jobs — retries
-- ---------------------------------------------------------------------------

alter table public.wallet_sync_jobs
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists next_retry_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. claim_wallet_sync_jobs — respecter next_retry_at
-- ---------------------------------------------------------------------------

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
      and (j.next_retry_at is null or j.next_retry_at <= now())
      and (j.locked_at is null or j.locked_at < now() - interval '5 minutes')
    order by j.created_at
    for update skip locked
    limit greatest(coalesce(p_limit, 20), 1)
  )
  returning *;
$$;
