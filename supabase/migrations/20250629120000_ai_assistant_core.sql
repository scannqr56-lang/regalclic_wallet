-- Phase 2 — Assistant IA Fidélité : schéma core + RLS
-- Décisions : plan manuel, essai Starter, tables ai_*, pas de Stripe

-- ---------------------------------------------------------------------------
-- 1. Extension businesses (billing V1)
-- ---------------------------------------------------------------------------

alter table public.businesses
  add column if not exists plan text not null default 'starter',
  add column if not exists ai_trial_used boolean not null default false;

alter table public.businesses
  drop constraint if exists businesses_plan_check;

alter table public.businesses
  add constraint businesses_plan_check
  check (plan in ('starter', 'pro_ia', 'business'));

comment on column public.businesses.plan is
  'Plan commercial : starter (défaut), pro_ia, business — attribution manuelle V1';
comment on column public.businesses.ai_trial_used is
  'True après consommation de la génération IA gratuite (plan starter)';

-- ---------------------------------------------------------------------------
-- 2. ai_menu_uploads
-- ---------------------------------------------------------------------------

create table public.ai_menu_uploads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'extracting', 'extracted', 'failed')),
  extracted_text text,
  extracted_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_menu_uploads_business_id_idx
  on public.ai_menu_uploads (business_id, created_at desc);
create index ai_menu_uploads_status_idx
  on public.ai_menu_uploads (business_id, status);

create trigger ai_menu_uploads_set_updated_at
  before update on public.ai_menu_uploads
  for each row execute function public.set_updated_at();

comment on table public.ai_menu_uploads is
  'Menus uploadés pour extraction IA — fichiers dans bucket business-private';

-- ---------------------------------------------------------------------------
-- 3. ai_restaurant_profiles
-- ---------------------------------------------------------------------------

create table public.ai_restaurant_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  business_type text,
  main_objective text,
  quiet_days text[] not null default '{}',
  quiet_hours text,
  products_to_push text[] not null default '{}',
  preferred_rewards text[] not null default '{}',
  average_ticket numeric(10, 2),
  generosity_level text
    check (generosity_level is null or generosity_level in ('prudent', 'balanced', 'aggressive')),
  tone_of_voice text,
  offers_to_avoid text,
  margin_sensitivity text
    check (margin_sensitivity is null or margin_sensitivity in ('faible', 'moyenne', 'élevée')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_restaurant_profiles_one_per_business unique (business_id)
);

create index ai_restaurant_profiles_business_id_idx
  on public.ai_restaurant_profiles (business_id);

create trigger ai_restaurant_profiles_set_updated_at
  before update on public.ai_restaurant_profiles
  for each row execute function public.set_updated_at();

comment on table public.ai_restaurant_profiles is
  'Profil questionnaire IA — 1 profil actif par commerce';

-- ---------------------------------------------------------------------------
-- 4. ai_suggestion_batches
-- ---------------------------------------------------------------------------

create table public.ai_suggestion_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  menu_upload_id uuid references public.ai_menu_uploads(id) on delete set null,
  profile_id uuid references public.ai_restaurant_profiles(id) on delete set null,
  type text not null default 'full_plan'
    check (type in ('full_plan', 'rewards_only', 'offers_only', 'notifications_only')),
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  prompt_version text,
  model_used text,
  raw_input jsonb,
  raw_output jsonb,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_suggestion_batches_business_id_idx
  on public.ai_suggestion_batches (business_id, created_at desc);
create index ai_suggestion_batches_status_idx
  on public.ai_suggestion_batches (business_id, status);
create index ai_suggestion_batches_menu_upload_id_idx
  on public.ai_suggestion_batches (menu_upload_id)
  where menu_upload_id is not null;

comment on table public.ai_suggestion_batches is
  'Lot de génération IA (récompenses + offres + notifs + calendrier 30j)';

-- ---------------------------------------------------------------------------
-- 5. ai_suggestions
-- ---------------------------------------------------------------------------

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  batch_id uuid not null references public.ai_suggestion_batches(id) on delete cascade,
  suggestion_type text not null
    check (suggestion_type in ('reward', 'offer', 'notification', 'threshold', 'calendar_tip')),
  title text not null,
  description text,
  objective text,
  customer_message text,
  wallet_notification_title text,
  wallet_notification_body text,
  recommended_threshold integer,
  recommended_timing text,
  target_segment text not null default 'all'
    check (target_segment in ('all', 'loyal', 'inactive', 'new')),
  margin_risk text not null default 'medium'
    check (margin_risk in ('low', 'medium', 'high')),
  confidence_score numeric(4, 3)
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  explanation text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'modified', 'discarded', 'applied')),
  applied_entity_type text
    check (applied_entity_type is null or applied_entity_type in ('wallet_campaign', 'loyalty_program')),
  applied_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_suggestions_business_id_idx
  on public.ai_suggestions (business_id, created_at desc);
create index ai_suggestions_batch_id_idx
  on public.ai_suggestions (batch_id);
create index ai_suggestions_status_idx
  on public.ai_suggestions (business_id, status);
create index ai_suggestions_type_idx
  on public.ai_suggestions (batch_id, suggestion_type);

create trigger ai_suggestions_set_updated_at
  before update on public.ai_suggestions
  for each row execute function public.set_updated_at();

comment on table public.ai_suggestions is
  'Suggestions IA individuelles — validation humaine obligatoire avant application';

-- ---------------------------------------------------------------------------
-- 6. ai_marketing_calendar_items
-- ---------------------------------------------------------------------------

create table public.ai_marketing_calendar_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  batch_id uuid not null references public.ai_suggestion_batches(id) on delete cascade,
  suggestion_id uuid references public.ai_suggestions(id) on delete set null,
  scheduled_date date not null,
  title text not null,
  objective text,
  offer_message text,
  wallet_message text,
  target_segment text not null default 'all'
    check (target_segment in ('all', 'loyal', 'inactive', 'new')),
  advice text,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'published', 'ignored')),
  wallet_campaign_id uuid references public.wallet_campaigns(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_marketing_calendar_items_business_id_idx
  on public.ai_marketing_calendar_items (business_id, scheduled_date);
create index ai_marketing_calendar_items_batch_id_idx
  on public.ai_marketing_calendar_items (batch_id);
create index ai_marketing_calendar_items_status_idx
  on public.ai_marketing_calendar_items (business_id, status);

create trigger ai_marketing_calendar_items_set_updated_at
  before update on public.ai_marketing_calendar_items
  for each row execute function public.set_updated_at();

comment on table public.ai_marketing_calendar_items is
  'Entrées calendrier marketing IA (défaut 30 jours par génération)';

-- ---------------------------------------------------------------------------
-- 7. ai_usage_logs
-- ---------------------------------------------------------------------------

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null
    check (action in ('upload_menu', 'extract_menu', 'generate_batch', 'apply_suggestion')),
  batch_id uuid references public.ai_suggestion_batches(id) on delete set null,
  tokens_input integer,
  tokens_output integer,
  cost_estimate numeric(12, 6),
  model_used text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index ai_usage_logs_business_id_idx
  on public.ai_usage_logs (business_id, created_at desc);
create index ai_usage_logs_batch_id_idx
  on public.ai_usage_logs (batch_id)
  where batch_id is not null;
create index ai_usage_logs_action_idx
  on public.ai_usage_logs (business_id, action, created_at desc);

comment on table public.ai_usage_logs is
  'Journal usage IA (tokens, coûts) — insert via Edge Functions (service_role)';

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------

alter table public.ai_menu_uploads enable row level security;
alter table public.ai_restaurant_profiles enable row level security;
alter table public.ai_suggestion_batches enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.ai_marketing_calendar_items enable row level security;
alter table public.ai_usage_logs enable row level security;

-- ai_menu_uploads
create policy "ai_menu_uploads_select_member"
  on public.ai_menu_uploads for select
  using (public.is_business_member(business_id));

create policy "ai_menu_uploads_insert_member"
  on public.ai_menu_uploads for insert
  with check (
    public.is_business_member(business_id)
    and uploaded_by = auth.uid()
  );

create policy "ai_menu_uploads_update_member"
  on public.ai_menu_uploads for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "ai_menu_uploads_delete_member"
  on public.ai_menu_uploads for delete
  using (public.is_business_member(business_id));

-- ai_restaurant_profiles
create policy "ai_restaurant_profiles_select_member"
  on public.ai_restaurant_profiles for select
  using (public.is_business_member(business_id));

create policy "ai_restaurant_profiles_insert_member"
  on public.ai_restaurant_profiles for insert
  with check (public.is_business_member(business_id));

create policy "ai_restaurant_profiles_update_member"
  on public.ai_restaurant_profiles for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ai_suggestion_batches — lecture dashboard ; création via Edge Function (service_role)
create policy "ai_suggestion_batches_select_member"
  on public.ai_suggestion_batches for select
  using (public.is_business_member(business_id));

-- ai_suggestions
create policy "ai_suggestions_select_member"
  on public.ai_suggestions for select
  using (public.is_business_member(business_id));

create policy "ai_suggestions_update_member"
  on public.ai_suggestions for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ai_marketing_calendar_items
create policy "ai_marketing_calendar_items_select_member"
  on public.ai_marketing_calendar_items for select
  using (public.is_business_member(business_id));

create policy "ai_marketing_calendar_items_update_member"
  on public.ai_marketing_calendar_items for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ai_usage_logs — lecture seule côté client
create policy "ai_usage_logs_select_member"
  on public.ai_usage_logs for select
  using (public.is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- 9. Grants explicites
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.ai_menu_uploads to authenticated;
grant select, insert, update on public.ai_restaurant_profiles to authenticated;
grant select on public.ai_suggestion_batches to authenticated;
grant select, update on public.ai_suggestions to authenticated;
grant select, update on public.ai_marketing_calendar_items to authenticated;
grant select on public.ai_usage_logs to authenticated;

revoke insert, update, delete on public.ai_usage_logs from authenticated;
revoke insert, update, delete on public.ai_suggestion_batches from authenticated;
