-- get_session_profile() fait un UPDATE : ne peut pas être STABLE (erreur 0A000 en RPC)

create or replace function public.get_session_profile()
returns json
language plpgsql
volatile
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

-- Lier immédiatement le compte admin existant
update public.platform_admins
set user_id = 'a28dc946-99da-4b7e-9bcf-96704fc1681a'
where email = 'admin@regalclic.com'
  and user_id is null;
