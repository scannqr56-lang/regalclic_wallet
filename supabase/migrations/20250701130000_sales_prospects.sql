-- Prospects commerciaux — formulaire apporteurs d'affaires RegalClic

create table if not exists public.sales_prospects (
  id uuid primary key default gen_random_uuid(),

  -- Commercial
  commercial_name text,
  commercial_email text,
  commercial_phone text,
  commercial_code text,
  contact_date date,
  contact_channel text,

  -- Commerce
  business_name text not null,
  business_type text not null,
  city text not null,
  postal_code text,
  address text,
  area text,
  google_maps_url text,
  website_url text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  other_url text,

  -- Contact prospect
  contact_name text,
  contact_role text,
  phone_landline text,
  phone_mobile text,
  email text,
  preferred_contact_method text,

  -- Situation
  has_loyalty_system text,
  loyalty_system_details text,
  has_pos_or_kiosk text,
  pos_or_kiosk_name text,
  loyalty_interest text,

  -- Besoins / objections
  main_problem text,
  objections text[] not null default '{}',
  objection_notes text,
  expressed_need text,
  commercial_notes text,

  -- Suivi
  interest_level text not null,
  wants_demo text,
  demo_done boolean not null default false,
  follow_up_date date,
  next_action text,
  status text not null default 'new',

  -- Offre
  offer_presented text,
  price_announced text,
  setup_fee_announced text,
  launch_offer_presented boolean not null default false,
  offer_comment text,

  -- Liens
  photo_url text,
  instagram_screenshot_url text,
  menu_url text,
  document_url text,

  -- Notes admin (mises à jour depuis l'espace admin)
  internal_notes text,

  -- Métadonnées
  source text not null default 'commercial_form',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_prospects_status_idx on public.sales_prospects (status);
create index if not exists sales_prospects_city_idx on public.sales_prospects (city);
create index if not exists sales_prospects_business_type_idx on public.sales_prospects (business_type);
create index if not exists sales_prospects_commercial_code_idx on public.sales_prospects (commercial_code);
create index if not exists sales_prospects_follow_up_date_idx on public.sales_prospects (follow_up_date);
create index if not exists sales_prospects_created_at_idx on public.sales_prospects (created_at desc);
create index if not exists sales_prospects_interest_level_idx on public.sales_prospects (interest_level);

create trigger sales_prospects_set_updated_at
  before update on public.sales_prospects
  for each row execute function public.set_updated_at();

alter table public.sales_prospects enable row level security;

-- Aucun accès direct anon/authenticated : insert/select via edge functions (service role).
-- Lecture / mise à jour réservées aux admins plateforme via policies de secours.

create policy sales_prospects_admin_select
  on public.sales_prospects
  for select
  to authenticated
  using (public.is_platform_admin());

create policy sales_prospects_admin_update
  on public.sales_prospects
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
