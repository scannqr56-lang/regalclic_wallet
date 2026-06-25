-- RegalClic Wallet V1 — RPC métier (actions critiques atomiques)

-- ---------------------------------------------------------------------------
-- get_my_business — commerce du restaurateur connecté
-- ---------------------------------------------------------------------------

create or replace function public.get_my_business()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_program public.loyalty_programs;
  v_role text;
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  select b.id into v_business_id
  from public.businesses b
  where b.owner_id = auth.uid()
  order by b.created_at asc
  limit 1;

  if v_business_id is not null then
    v_role := 'owner';
  else
    select b.id, s.role into v_business_id, v_role
    from public.business_staff s
    join public.businesses b on b.id = s.business_id
    where s.user_id = auth.uid()
    order by s.created_at asc
    limit 1;
  end if;

  if v_business_id is null then
    return null;
  end if;

  select * into v_business from public.businesses where id = v_business_id;

  select * into v_program
  from public.loyalty_programs lp
  where lp.business_id = v_business_id
  limit 1;

  return json_build_object(
    'business', row_to_json(v_business),
    'loyalty_program', row_to_json(v_program),
    'staff_role', v_role
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_business_public_by_slug — page inscription (lecture publique enrichie)
-- ---------------------------------------------------------------------------

create or replace function public.get_business_public_by_slug(p_slug text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_program public.loyalty_programs;
  v_reward public.rewards;
begin
  if p_slug is null or trim(p_slug) = '' then
    raise exception 'Slug invalide';
  end if;

  select * into v_business
  from public.businesses b
  where lower(trim(b.slug)) = lower(trim(p_slug))
    and b.is_active = true
  limit 1;

  if v_business.id is null then
    return null;
  end if;

  select * into v_program
  from public.loyalty_programs lp
  where lp.business_id = v_business.id
    and lp.is_active = true
  limit 1;

  select * into v_reward
  from public.rewards r
  where r.business_id = v_business.id
    and r.is_active = true
  order by r.created_at desc
  limit 1;

  return json_build_object(
    'business', json_build_object(
      'id', v_business.id,
      'name', v_business.name,
      'slug', v_business.slug,
      'logo_url', v_business.logo_url,
      'primary_color', v_business.primary_color,
      'address', v_business.address,
      'city', v_business.city
    ),
    'loyalty_program', case when v_program.id is null then null else json_build_object(
      'id', v_program.id,
      'name', v_program.name,
      'type', v_program.type,
      'points_per_euro', v_program.points_per_euro,
      'stamps_required', v_program.stamps_required,
      'reward_label', v_program.reward_label,
      'reward_threshold', v_program.reward_threshold
    ) end,
    'reward', case when v_reward.id is null then null else json_build_object(
      'name', v_reward.name,
      'description', v_reward.description,
      'threshold_value', v_reward.threshold_value,
      'type', v_reward.type
    ) end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_public_membership — inscription client sans compte (service role)
-- ---------------------------------------------------------------------------

create or replace function public.create_public_membership(
  p_business_slug text,
  p_first_name text,
  p_last_name text default null,
  p_phone text default null,
  p_email text default null,
  p_consent boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_program public.loyalty_programs;
  v_customer_id uuid;
  v_membership public.customer_memberships;
  v_card text;
  v_token text;
begin
  if coalesce(p_consent, false) is not true then
    raise exception 'Le consentement est requis';
  end if;

  if p_first_name is null or trim(p_first_name) = '' then
    raise exception 'Le prénom est requis';
  end if;

  select * into v_business
  from public.businesses b
  where lower(trim(b.slug)) = lower(trim(p_business_slug))
    and b.is_active = true
  limit 1;

  if v_business.id is null then
    raise exception 'Commerce introuvable';
  end if;

  select * into v_program
  from public.loyalty_programs lp
  where lp.business_id = v_business.id
    and lp.is_active = true
  limit 1;

  if v_program.id is null then
    raise exception 'Aucun programme de fidélité actif pour ce commerce';
  end if;

  -- Réutiliser client existant si email ou téléphone correspond (même commerce)
  v_customer_id := null;

  if p_email is not null and trim(p_email) <> '' then
    select c.id into v_customer_id
    from public.customers c
    join public.customer_memberships m on m.customer_id = c.id
    where m.business_id = v_business.id
      and m.status = 'active'
      and lower(trim(c.email)) = lower(trim(p_email))
    limit 1;
  end if;

  if v_customer_id is null and p_phone is not null and trim(p_phone) <> '' then
    select c.id into v_customer_id
    from public.customers c
    join public.customer_memberships m on m.customer_id = c.id
    where m.business_id = v_business.id
      and m.status = 'active'
      and trim(c.phone) = trim(p_phone)
    limit 1;
  end if;

  if v_customer_id is not null then
    select * into v_membership
    from public.customer_memberships m
    where m.customer_id = v_customer_id
      and m.business_id = v_business.id
      and m.status = 'active'
    limit 1;

    return json_build_object(
      'membership_id', v_membership.id,
      'card_number', v_membership.card_number,
      'already_exists', true
    );
  end if;

  insert into public.customers (first_name, last_name, phone, email)
  values (
    trim(p_first_name),
    nullif(trim(coalesce(p_last_name, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), '')
  )
  returning id into v_customer_id;

  v_card := public.generate_card_number();
  v_token := public.generate_qr_token();

  insert into public.customer_memberships (
    customer_id,
    business_id,
    loyalty_program_id,
    card_number,
    qr_token,
    status
  ) values (
    v_customer_id,
    v_business.id,
    v_program.id,
    v_card,
    v_token,
    'active'
  )
  returning * into v_membership;

  return json_build_object(
    'membership_id', v_membership.id,
    'card_number', v_membership.card_number,
    'qr_token', v_membership.qr_token,
    'already_exists', false
  );
exception
  when unique_violation then
    raise exception 'Une carte existe déjà pour ce client dans ce commerce';
end;
$$;

-- ---------------------------------------------------------------------------
-- lookup_membership_by_qr_token — scanner restaurateur
-- ---------------------------------------------------------------------------

create or replace function public.lookup_membership_by_qr_token(p_qr_token text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token text;
  v_membership public.customer_memberships;
  v_customer public.customers;
  v_program public.loyalty_programs;
  v_transactions json;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  v_token := trim(coalesce(p_qr_token, ''));
  if v_token = '' then
    raise exception 'QR token invalide';
  end if;

  -- Extraire token depuis URL si besoin : .../scan/TOKEN
  if v_token like '%/scan/%' then
    v_token := regexp_replace(v_token, '^.*/scan/', '');
  end if;

  select * into v_membership
  from public.customer_memberships m
  where m.qr_token = v_token
    and m.status = 'active'
  limit 1;

  if v_membership.id is null then
    raise exception 'Carte introuvable';
  end if;

  if not public.is_business_member(v_membership.business_id) then
    raise exception 'Accès refusé : cette carte n''appartient pas à votre commerce';
  end if;

  select * into v_customer from public.customers c where c.id = v_membership.customer_id;
  select * into v_program from public.loyalty_programs lp where lp.id = v_membership.loyalty_program_id;

  select coalesce(json_agg(row_to_json(t) order by t.created_at desc), '[]'::json)
  into v_transactions
  from (
    select id, type, amount_spent, points_delta, stamps_delta, rewards_delta, note, created_at
    from public.loyalty_transactions
    where membership_id = v_membership.id
    order by created_at desc
    limit 10
  ) t;

  return json_build_object(
    'membership', row_to_json(v_membership),
    'customer', row_to_json(v_customer),
    'loyalty_program', row_to_json(v_program),
    'recent_transactions', v_transactions
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- add_points_to_membership
-- ---------------------------------------------------------------------------

create or replace function public.add_points_to_membership(
  p_membership_id uuid,
  p_amount_spent numeric default null,
  p_manual_points integer default null,
  p_note text default null
)
returns public.customer_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.customer_memberships;
  v_prog public.loyalty_programs;
  v_points_delta integer;
  v_threshold integer;
  v_new_balance integer;
  v_rewards_to_add integer := 0;
  v_points_after_deduct integer;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  select * into v_m
  from public.customer_memberships
  where id = p_membership_id
  for update;

  if v_m.id is null then
    raise exception 'Membership introuvable';
  end if;

  if not public.is_business_member(v_m.business_id) then
    raise exception 'Accès refusé';
  end if;

  if v_m.status <> 'active' then
    raise exception 'Carte non active';
  end if;

  select * into v_prog from public.loyalty_programs where id = v_m.loyalty_program_id;

  if v_prog.type <> 'points' then
    raise exception 'Ce programme n''est pas basé sur les points';
  end if;

  if p_manual_points is not null then
    v_points_delta := p_manual_points;
  elsif p_amount_spent is not null and p_amount_spent > 0 then
    v_points_delta := floor(p_amount_spent * coalesce(v_prog.points_per_euro, 1))::integer;
  else
    raise exception 'Montant ou points manuels requis';
  end if;

  if v_points_delta <= 0 then
    raise exception 'Le nombre de points doit être positif';
  end if;

  v_new_balance := v_m.points_balance + v_points_delta;
  v_threshold := coalesce(v_prog.reward_threshold, 100);

  if v_threshold > 0 and v_new_balance >= v_threshold then
    v_rewards_to_add := v_new_balance / v_threshold;
    v_points_after_deduct := v_new_balance - (v_rewards_to_add * v_threshold);
  else
    v_points_after_deduct := v_new_balance;
  end if;

  update public.customer_memberships
  set
    points_balance = v_points_after_deduct,
    rewards_available = rewards_available + v_rewards_to_add,
    updated_at = now()
  where id = p_membership_id
  returning * into v_m;

  insert into public.loyalty_transactions (
    membership_id, business_id, type, amount_spent,
    points_delta, rewards_delta, note, created_by
  ) values (
    p_membership_id, v_m.business_id, 'earn_points',
    p_amount_spent, v_points_delta, v_rewards_to_add, p_note, auth.uid()
  );

  return v_m;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_stamp_to_membership
-- ---------------------------------------------------------------------------

create or replace function public.add_stamp_to_membership(
  p_membership_id uuid,
  p_note text default null
)
returns public.customer_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.customer_memberships;
  v_prog public.loyalty_programs;
  v_stamps_required integer;
  v_new_stamps integer;
  v_rewards_to_add integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  select * into v_m
  from public.customer_memberships
  where id = p_membership_id
  for update;

  if v_m.id is null then
    raise exception 'Membership introuvable';
  end if;

  if not public.is_business_member(v_m.business_id) then
    raise exception 'Accès refusé';
  end if;

  if v_m.status <> 'active' then
    raise exception 'Carte non active';
  end if;

  select * into v_prog from public.loyalty_programs where id = v_m.loyalty_program_id;

  if v_prog.type <> 'stamps' then
    raise exception 'Ce programme n''est pas basé sur les tampons';
  end if;

  v_stamps_required := greatest(coalesce(v_prog.stamps_required, 10), 1);
  v_new_stamps := v_m.stamps_balance + 1;

  if v_new_stamps >= v_stamps_required then
    v_rewards_to_add := 1;
    v_new_stamps := v_new_stamps - v_stamps_required;
  end if;

  update public.customer_memberships
  set
    stamps_balance = v_new_stamps,
    rewards_available = rewards_available + v_rewards_to_add,
    updated_at = now()
  where id = p_membership_id
  returning * into v_m;

  insert into public.loyalty_transactions (
    membership_id, business_id, type,
    stamps_delta, rewards_delta, note, created_by
  ) values (
    p_membership_id, v_m.business_id, 'earn_stamp',
    1, v_rewards_to_add, p_note, auth.uid()
  );

  return v_m;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_reward
-- ---------------------------------------------------------------------------

create or replace function public.redeem_reward(
  p_membership_id uuid,
  p_note text default null
)
returns public.customer_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.customer_memberships;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  select * into v_m
  from public.customer_memberships
  where id = p_membership_id
  for update;

  if v_m.id is null then
    raise exception 'Membership introuvable';
  end if;

  if not public.is_business_member(v_m.business_id) then
    raise exception 'Accès refusé';
  end if;

  if v_m.rewards_available < 1 then
    raise exception 'Aucune récompense disponible';
  end if;

  update public.customer_memberships
  set
    rewards_available = rewards_available - 1,
    updated_at = now()
  where id = p_membership_id
  returning * into v_m;

  insert into public.loyalty_transactions (
    membership_id, business_id, type,
    rewards_delta, note, created_by
  ) values (
    p_membership_id, v_m.business_id, 'redeem_reward',
    -1, p_note, auth.uid()
  );

  return v_m;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_business_stats — KPIs dashboard
-- ---------------------------------------------------------------------------

create or replace function public.get_business_stats(p_business_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_customers_count integer;
  v_total_points integer;
  v_total_stamps integer;
  v_rewards_pending integer;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Accès refusé';
  end if;

  select count(*)::integer into v_customers_count
  from public.customer_memberships
  where business_id = p_business_id and status = 'active';

  select coalesce(sum(points_delta), 0)::integer into v_total_points
  from public.loyalty_transactions
  where business_id = p_business_id and type = 'earn_points';

  select coalesce(sum(stamps_delta), 0)::integer into v_total_stamps
  from public.loyalty_transactions
  where business_id = p_business_id and type = 'earn_stamp';

  select coalesce(sum(rewards_available), 0)::integer into v_rewards_pending
  from public.customer_memberships
  where business_id = p_business_id and status = 'active';

  return json_build_object(
    'customers_count', v_customers_count,
    'total_points_distributed', v_total_points,
    'total_stamps_distributed', v_total_stamps,
    'rewards_pending', v_rewards_pending
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.get_my_business() from public;
revoke all on function public.get_business_public_by_slug(text) from public;
revoke all on function public.create_public_membership(text, text, text, text, text, boolean) from public;
revoke all on function public.lookup_membership_by_qr_token(text) from public;
revoke all on function public.add_points_to_membership(uuid, numeric, integer, text) from public;
revoke all on function public.add_stamp_to_membership(uuid, text) from public;
revoke all on function public.redeem_reward(uuid, text) from public;
revoke all on function public.get_business_stats(uuid) from public;

grant execute on function public.get_my_business() to authenticated;
grant execute on function public.get_business_public_by_slug(text) to anon, authenticated;
grant execute on function public.lookup_membership_by_qr_token(text) to authenticated;
grant execute on function public.add_points_to_membership(uuid, numeric, integer, text) to authenticated;
grant execute on function public.add_stamp_to_membership(uuid, text) to authenticated;
grant execute on function public.redeem_reward(uuid, text) to authenticated;
grant execute on function public.get_business_stats(uuid) to authenticated;

grant execute on function public.create_public_membership(text, text, text, text, text, boolean) to service_role;
