-- Fiabiliser la détection admin : email depuis auth.users si absent du JWT

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(trim(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    (select u.email from auth.users u where u.id = auth.uid())
  )));
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
       or lower(pa.email) = public.current_user_email()
  );
$$;

create or replace function public.get_session_profile()
returns json
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := public.current_user_email();
  v_merchant public.merchant_accounts;
  v_is_admin boolean;
begin
  if v_uid is null then
    return null;
  end if;

  if v_email is not null and v_email <> '' then
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

grant execute on function public.current_user_email() to authenticated;
