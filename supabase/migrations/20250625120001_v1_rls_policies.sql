-- RegalClic Wallet V1 — RLS et policies

-- ---------------------------------------------------------------------------
-- Helpers RLS
-- ---------------------------------------------------------------------------

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = auth.uid()
  );
$$;

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.business_staff s
    where s.business_id = p_business_id
      and s.user_id = auth.uid()
  );
$$;

comment on function public.is_business_member(uuid) is
  'Vrai si l''utilisateur connecté est owner ou staff du commerce.';

-- ---------------------------------------------------------------------------
-- Activer RLS
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.business_staff enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.customers enable row level security;
alter table public.customer_memberships enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.wallet_passes enable row level security;
alter table public.apple_wallet_registrations enable row level security;
alter table public.wallet_sync_jobs enable row level security;

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------

create policy "businesses_select_active_public"
  on public.businesses
  for select
  using (is_active = true);

create policy "businesses_select_member"
  on public.businesses
  for select
  using (public.is_business_member(id));

create policy "businesses_insert_owner"
  on public.businesses
  for insert
  with check (owner_id = auth.uid());

create policy "businesses_update_member"
  on public.businesses
  for update
  using (public.is_business_member(id))
  with check (public.is_business_member(id));

create policy "businesses_delete_owner"
  on public.businesses
  for delete
  using (public.is_business_owner(id));

-- ---------------------------------------------------------------------------
-- business_staff
-- ---------------------------------------------------------------------------

create policy "business_staff_select_member"
  on public.business_staff
  for select
  using (public.is_business_member(business_id));

create policy "business_staff_manage_owner"
  on public.business_staff
  for all
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

-- ---------------------------------------------------------------------------
-- loyalty_programs
-- ---------------------------------------------------------------------------

create policy "loyalty_programs_select_public_active"
  on public.loyalty_programs
  for select
  using (
    is_active = true
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.is_active = true
    )
  );

create policy "loyalty_programs_select_member"
  on public.loyalty_programs
  for select
  using (public.is_business_member(business_id));

create policy "loyalty_programs_modify_member"
  on public.loyalty_programs
  for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- customers — visibles uniquement via commerce du staff
-- ---------------------------------------------------------------------------

create policy "customers_select_via_membership"
  on public.customers
  for select
  using (
    exists (
      select 1
      from public.customer_memberships m
      where m.customer_id = customers.id
        and public.is_business_member(m.business_id)
    )
  );

-- Pas d'insert/update direct client : RPC service role uniquement

-- ---------------------------------------------------------------------------
-- customer_memberships
-- ---------------------------------------------------------------------------

create policy "memberships_select_member"
  on public.customer_memberships
  for select
  using (public.is_business_member(business_id));

create policy "memberships_update_member"
  on public.customer_memberships
  for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- Insert via RPC create_public_membership (service role) uniquement

-- ---------------------------------------------------------------------------
-- loyalty_transactions
-- ---------------------------------------------------------------------------

create policy "transactions_select_member"
  on public.loyalty_transactions
  for select
  using (public.is_business_member(business_id));

-- Insert via RPC métier uniquement (security definer)

-- ---------------------------------------------------------------------------
-- rewards
-- ---------------------------------------------------------------------------

create policy "rewards_select_public_active"
  on public.rewards
  for select
  using (
    is_active = true
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.is_active = true
    )
  );

create policy "rewards_select_member"
  on public.rewards
  for select
  using (public.is_business_member(business_id));

create policy "rewards_modify_member"
  on public.rewards
  for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- wallet_passes, apple_wallet_registrations, wallet_sync_jobs
-- Accès client refusé — Edge Functions avec service_role uniquement
-- (RLS activé, aucune policy = deny pour anon/authenticated)
-- ---------------------------------------------------------------------------
