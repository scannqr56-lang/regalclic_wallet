-- RegalClic Wallet V1 — Schéma core
-- Projet indépendant de meytiz-fidelite (legacy)

-- Sur Supabase, pgcrypto vit dans le schéma extensions
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_qr_token()
returns text
language sql
volatile
as $$
  select encode(extensions.gen_random_bytes(24), 'hex');
$$;

create or replace function public.generate_card_number()
returns text
language plpgsql
volatile
as $$
declare
  v_code text;
begin
  loop
    v_code := 'RC-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
    exit when not exists (
      select 1 from public.customer_memberships m where m.card_number = v_code
    );
  end loop;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. businesses
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null,
  logo_url text,
  primary_color text not null default '#0B1E3F',
  address text,
  city text,
  postal_code text,
  country text not null default 'FR',
  phone text,
  website text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_slug_unique unique (slug),
  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index businesses_owner_id_idx on public.businesses (owner_id);
create index businesses_slug_idx on public.businesses (slug) where is_active = true;

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. business_staff
-- ---------------------------------------------------------------------------

create table public.business_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_staff_user_id_idx on public.business_staff (user_id);

-- Auto-ajout owner dans business_staff à la création du commerce
create or replace function public.trg_businesses_add_owner_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_staff (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (business_id, user_id) do nothing;
  return new;
end;
$$;

create trigger tr_businesses_add_owner_staff
  after insert on public.businesses
  for each row
  execute function public.trg_businesses_add_owner_staff();

-- ---------------------------------------------------------------------------
-- 3. loyalty_programs
-- ---------------------------------------------------------------------------

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null default 'Programme fidélité',
  type text not null check (type in ('points', 'stamps')),
  points_per_euro numeric(10, 2) not null default 1,
  stamps_required integer not null default 10,
  reward_label text not null default 'Récompense offerte',
  reward_threshold integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loyalty_programs_one_per_business unique (business_id)
);

create trigger loyalty_programs_set_updated_at
  before update on public.loyalty_programs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. customers
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_email_idx on public.customers (lower(trim(email))) where email is not null;
create index customers_phone_idx on public.customers (phone) where phone is not null;

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. customer_memberships
-- ---------------------------------------------------------------------------

create table public.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  loyalty_program_id uuid not null references public.loyalty_programs(id),
  card_number text not null,
  qr_token text not null,
  points_balance integer not null default 0 check (points_balance >= 0),
  stamps_balance integer not null default 0 check (stamps_balance >= 0),
  rewards_available integer not null default 0 check (rewards_available >= 0),
  status text not null default 'active' check (status in ('active', 'blocked', 'deleted')),
  apple_serial_number text,
  apple_auth_token text,
  google_object_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_memberships_card_number_unique unique (card_number),
  constraint customer_memberships_qr_token_unique unique (qr_token),
  constraint customer_memberships_apple_serial_unique unique (apple_serial_number),
  constraint customer_memberships_google_object_unique unique (google_object_id),
  constraint customer_memberships_customer_business_unique unique (customer_id, business_id)
);

create index customer_memberships_business_id_idx on public.customer_memberships (business_id);
create index customer_memberships_qr_token_idx on public.customer_memberships (qr_token);
create index customer_memberships_status_idx on public.customer_memberships (business_id, status);

create trigger customer_memberships_set_updated_at
  before update on public.customer_memberships
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. loyalty_transactions
-- ---------------------------------------------------------------------------

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.customer_memberships(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('earn_points', 'earn_stamp', 'redeem_reward', 'manual_adjustment')),
  amount_spent numeric(10, 2),
  points_delta integer not null default 0,
  stamps_delta integer not null default 0,
  rewards_delta integer not null default 0,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index loyalty_transactions_membership_id_idx on public.loyalty_transactions (membership_id, created_at desc);
create index loyalty_transactions_business_id_idx on public.loyalty_transactions (business_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. rewards
-- ---------------------------------------------------------------------------

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  loyalty_program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  threshold_value integer not null,
  type text not null check (type in ('points', 'stamps')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index rewards_business_id_idx on public.rewards (business_id) where is_active = true;

-- ---------------------------------------------------------------------------
-- 8. wallet_passes
-- ---------------------------------------------------------------------------

create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.customer_memberships(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  serial_number text,
  object_id text,
  last_generated_at timestamptz,
  last_updated_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (membership_id, platform)
);

-- ---------------------------------------------------------------------------
-- 9. apple_wallet_registrations (PassKit web service)
-- ---------------------------------------------------------------------------

create table public.apple_wallet_registrations (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.customer_memberships(id) on delete cascade,
  device_library_identifier text not null,
  push_token text,
  pass_type_identifier text not null,
  serial_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_library_identifier, serial_number)
);

create index apple_wallet_registrations_serial_idx
  on public.apple_wallet_registrations (serial_number);

create trigger apple_wallet_registrations_set_updated_at
  before update on public.apple_wallet_registrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. wallet_sync_jobs (mise à jour Wallet post-transaction)
-- ---------------------------------------------------------------------------

create table public.wallet_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.customer_memberships(id) on delete cascade,
  reason text not null default 'balance_change',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  locked_at timestamptz
);

create index wallet_sync_jobs_pending_idx
  on public.wallet_sync_jobs (created_at)
  where processed_at is null;

create unique index wallet_sync_jobs_one_pending_per_membership
  on public.wallet_sync_jobs (membership_id)
  where processed_at is null;

-- Trigger : file d'attente sync Wallet quand le solde change
create or replace function public.enqueue_wallet_sync_on_balance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.points_balance is distinct from old.points_balance
     or new.stamps_balance is distinct from old.stamps_balance
     or new.rewards_available is distinct from old.rewards_available then
    if not exists (
      select 1 from public.wallet_sync_jobs j
      where j.membership_id = new.id and j.processed_at is null
    ) then
      insert into public.wallet_sync_jobs (membership_id, reason)
      values (new.id, 'balance_change');
    end if;
  end if;
  return new;
end;
$$;

create trigger tr_customer_memberships_wallet_sync
  after update of points_balance, stamps_balance, rewards_available
  on public.customer_memberships
  for each row
  execute function public.enqueue_wallet_sync_on_balance_change();
