-- Administration plateforme : comptes commerçants créés par l'admin uniquement

-- ---------------------------------------------------------------------------
-- 1. platform_admins
-- ---------------------------------------------------------------------------

create table public.platform_admins (
  email text primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Administrateurs RegalClic autorisés à gérer les comptes commerçants';

insert into public.platform_admins (email)
values ('admin@regalclic.com')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- 2. merchant_accounts
-- ---------------------------------------------------------------------------

create table public.merchant_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  notes text,
  is_disabled boolean not null default false,
  disabled_at timestamptz,
  disabled_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index merchant_accounts_email_idx on public.merchant_accounts (lower(email));
create index merchant_accounts_disabled_idx on public.merchant_accounts (is_disabled);

create trigger merchant_accounts_set_updated_at
  before update on public.merchant_accounts
  for each row execute function public.set_updated_at();

comment on table public.merchant_accounts is
  'Comptes restaurateur provisionnés par l''admin — requis pour accéder au dashboard';

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
       or lower(pa.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_active_merchant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.merchant_accounts m
    where m.user_id = auth.uid()
      and m.is_disabled = false
  );
$$;

comment on function public.is_platform_admin() is
  'Vrai si l''utilisateur connecté est administrateur plateforme RegalClic';

comment on function public.is_active_merchant() is
  'Vrai si l''utilisateur est un commerçant actif provisionné par l''admin';

-- ---------------------------------------------------------------------------
-- 4. Session profile RPC
-- ---------------------------------------------------------------------------

create or replace function public.get_session_profile()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_merchant public.merchant_accounts;
  v_is_admin boolean;
begin
  if v_uid is null then
    return null;
  end if;

  if v_email <> '' then
    update public.platform_admins
    set user_id = v_uid
    where lower(email) = v_email
      and (user_id is null or user_id = v_uid);
  end if;

  v_is_admin := public.is_platform_admin();

  select * into v_merchant
  from public.merchant_accounts m
  where m.user_id = v_uid;

  return json_build_object(
    'is_platform_admin', v_is_admin,
    'merchant', case when v_merchant.user_id is not null then row_to_json(v_merchant) else null end,
    'is_disabled', coalesce(v_merchant.is_disabled, false),
    'has_merchant_account', v_merchant.user_id is not null
  );
end;
$$;

grant execute on function public.get_session_profile() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------

alter table public.platform_admins enable row level security;
alter table public.merchant_accounts enable row level security;

create policy "platform_admins_select_self"
  on public.platform_admins for select
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "merchant_accounts_select_self"
  on public.merchant_accounts for select
  using (user_id = auth.uid());

grant select on public.platform_admins to authenticated;
grant select on public.merchant_accounts to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Restreindre création commerce aux commerçants provisionnés
-- ---------------------------------------------------------------------------

drop policy if exists "businesses_insert_owner" on public.businesses;

create policy "businesses_insert_merchant"
  on public.businesses
  for insert
  with check (
    owner_id = auth.uid()
    and public.is_active_merchant()
    and not public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 7. Rétrocompatibilité : owners existants → merchant_accounts
-- ---------------------------------------------------------------------------

insert into public.merchant_accounts (user_id, email, display_name, is_disabled)
select
  b.owner_id,
  lower(coalesce(u.email, b.owner_id::text || '@legacy.regalclic.local')),
  b.name,
  not b.is_active
from public.businesses b
left join auth.users u on u.id = b.owner_id
on conflict (user_id) do nothing;
