-- Phase 8 — Offres promotionnelles Wallet

-- ---------------------------------------------------------------------------
-- 1. wallet_campaigns
-- ---------------------------------------------------------------------------

create table if not exists public.wallet_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  message text not null,
  offer_label text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'ended')),
  activated_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_campaigns_dates_check check (ends_at > starts_at)
);

create index if not exists wallet_campaigns_business_idx
  on public.wallet_campaigns (business_id, created_at desc);

create unique index if not exists wallet_campaigns_one_active_per_business
  on public.wallet_campaigns (business_id)
  where status = 'active';

create trigger wallet_campaigns_set_updated_at
  before update on public.wallet_campaigns
  for each row execute function public.set_updated_at();

comment on table public.wallet_campaigns is 'Campagnes promo affichées sur les cartes Wallet actives';

-- ---------------------------------------------------------------------------
-- 2. wallet_campaign_broadcast_logs
-- ---------------------------------------------------------------------------

create table if not exists public.wallet_campaign_broadcast_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.wallet_campaigns(id) on delete cascade,
  membership_id uuid not null references public.customer_memberships(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  google_synced boolean not null default false,
  apple_synced boolean not null default false,
  google_error text,
  apple_error text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_campaign_broadcast_logs_campaign_idx
  on public.wallet_campaign_broadcast_logs (campaign_id, created_at desc);

create index if not exists wallet_campaign_broadcast_logs_membership_idx
  on public.wallet_campaign_broadcast_logs (membership_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.wallet_campaigns enable row level security;
alter table public.wallet_campaign_broadcast_logs enable row level security;

drop policy if exists "wallet_campaigns_select_member" on public.wallet_campaigns;
create policy "wallet_campaigns_select_member"
  on public.wallet_campaigns
  for select
  using (public.is_business_member(business_id));

drop policy if exists "wallet_campaigns_insert_member" on public.wallet_campaigns;
create policy "wallet_campaigns_insert_member"
  on public.wallet_campaigns
  for insert
  with check (
    public.is_business_member(business_id)
    and status = 'draft'
  );

drop policy if exists "wallet_campaigns_update_member" on public.wallet_campaigns;
create policy "wallet_campaigns_update_member"
  on public.wallet_campaigns
  for update
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and status in ('draft', 'active', 'ended')
  );

drop policy if exists "wallet_campaigns_delete_draft" on public.wallet_campaigns;
create policy "wallet_campaigns_delete_draft"
  on public.wallet_campaigns
  for delete
  using (
    public.is_business_member(business_id)
    and status = 'draft'
  );

drop policy if exists "wallet_campaign_broadcast_logs_select_member" on public.wallet_campaign_broadcast_logs;
create policy "wallet_campaign_broadcast_logs_select_member"
  on public.wallet_campaign_broadcast_logs
  for select
  using (public.is_business_member(business_id));
