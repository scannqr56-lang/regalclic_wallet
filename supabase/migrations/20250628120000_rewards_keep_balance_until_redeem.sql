-- Conserver points/tampons jusqu'à confirmation d'utilisation de la récompense en caisse

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
  v_old_reward_tiers integer;
  v_new_reward_tiers integer;
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
  v_threshold := greatest(coalesce(v_prog.reward_threshold, 100), 1);

  v_old_reward_tiers := v_m.points_balance / v_threshold;
  v_new_reward_tiers := v_new_balance / v_threshold;
  v_rewards_to_add := greatest(0, v_new_reward_tiers - v_old_reward_tiers);

  update public.customer_memberships
  set
    points_balance = v_new_balance,
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
  v_old_reward_tiers integer;
  v_new_reward_tiers integer;
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

  v_old_reward_tiers := v_m.stamps_balance / v_stamps_required;
  v_new_reward_tiers := v_new_stamps / v_stamps_required;
  v_rewards_to_add := greatest(0, v_new_reward_tiers - v_old_reward_tiers);

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
  v_prog public.loyalty_programs;
  v_threshold integer;
  v_stamps_required integer;
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

  select * into v_prog from public.loyalty_programs where id = v_m.loyalty_program_id;

  v_threshold := greatest(coalesce(v_prog.reward_threshold, 100), 1);
  v_stamps_required := greatest(coalesce(v_prog.stamps_required, 10), 1);

  update public.customer_memberships
  set
    rewards_available = rewards_available - 1,
    points_balance = case
      when v_prog.type = 'points' then greatest(0, points_balance - v_threshold)
      else points_balance
    end,
    stamps_balance = case
      when v_prog.type = 'stamps' then greatest(0, stamps_balance - v_stamps_required)
      else stamps_balance
    end,
    updated_at = now()
  where id = p_membership_id
  returning * into v_m;

  insert into public.loyalty_transactions (
    membership_id, business_id, type,
    points_delta, stamps_delta, rewards_delta, note, created_by
  ) values (
    p_membership_id,
    v_m.business_id,
    'redeem_reward',
    case when v_prog.type = 'points' then -v_threshold else 0 end,
    case when v_prog.type = 'stamps' then -v_stamps_required else 0 end,
    -1,
    p_note,
    auth.uid()
  );

  return v_m;
end;
$$;
