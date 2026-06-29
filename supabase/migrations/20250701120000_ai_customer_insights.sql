-- Phase 17 V2 : insights clients réels pour segmentation IA (sans PII)

create or replace function public.get_ai_customer_insights(
  p_business_id uuid,
  p_inactive_days integer default 30,
  p_loyal_min_visits integer default 3,
  p_loyal_window_days integer default 60,
  p_new_days integer default 30
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_all integer := 0;
  v_loyal integer := 0;
  v_inactive integer := 0;
  v_new integer := 0;
  v_transactions_30d integer := 0;
  v_pending_offers integer := 0;
  v_pending_notifications integer := 0;
  v_pending_total integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'Accès refusé';
  end if;

  with active_members as (
    select id, created_at
    from public.customer_memberships
    where business_id = p_business_id
      and status = 'active'
  ),
  last_visits as (
    select
      lt.membership_id,
      max(lt.created_at) as last_visit_at,
      count(*) filter (
        where lt.created_at >= now() - make_interval(days => p_loyal_window_days)
      )::integer as visits_in_window
    from public.loyalty_transactions lt
    where lt.business_id = p_business_id
      and lt.type in ('earn_points', 'earn_stamp')
    group by lt.membership_id
  ),
  enriched as (
    select
      m.id,
      m.created_at,
      lv.last_visit_at,
      coalesce(lv.visits_in_window, 0) as visits_in_window
    from active_members m
    left join last_visits lv on lv.membership_id = m.id
  ),
  segmented as (
    select
      id,
      (created_at >= now() - make_interval(days => p_new_days)
        and coalesce(visits_in_window, 0) <= 1) as is_new,
      (coalesce(visits_in_window, 0) >= p_loyal_min_visits) as is_loyal,
      (
        last_visit_at is null
        and created_at < now() - make_interval(days => p_inactive_days)
      ) or (
        last_visit_at is not null
        and last_visit_at < now() - make_interval(days => p_inactive_days)
      ) as is_inactive
    from enriched
  )
  select
    count(*)::integer,
    count(*) filter (where is_loyal)::integer,
    count(*) filter (where is_inactive)::integer,
    count(*) filter (where is_new)::integer
  into v_all, v_loyal, v_inactive, v_new
  from segmented;

  select count(*)::integer into v_transactions_30d
  from public.loyalty_transactions
  where business_id = p_business_id
    and type in ('earn_points', 'earn_stamp')
    and created_at >= now() - interval '30 days';

  select
    count(*) filter (where suggestion_type = 'offer')::integer,
    count(*) filter (where suggestion_type = 'notification')::integer,
    count(*)::integer
  into v_pending_offers, v_pending_notifications, v_pending_total
  from public.ai_suggestions
  where business_id = p_business_id
    and status = 'pending';

  return json_build_object(
    'segments', json_build_object(
      'all', v_all,
      'loyal', v_loyal,
      'inactive', v_inactive,
      'new', v_new
    ),
    'thresholds', json_build_object(
      'inactive_days', p_inactive_days,
      'loyal_min_visits', p_loyal_min_visits,
      'loyal_window_days', p_loyal_window_days,
      'new_days', p_new_days
    ),
    'activity', json_build_object(
      'earn_transactions_30d', v_transactions_30d
    ),
    'pending_suggestions', json_build_object(
      'offers', v_pending_offers,
      'notifications', v_pending_notifications,
      'total', v_pending_total
    ),
    'ready_this_week', (
      select count(*)::integer
      from public.ai_suggestions s
      where s.business_id = p_business_id
        and s.status = 'pending'
        and s.suggestion_type in ('offer', 'notification')
        and s.created_at >= date_trunc('week', now())
    ),
    'data_source', 'loyalty_transactions',
    'version', 'v2-preview'
  );
end;
$$;

comment on function public.get_ai_customer_insights(uuid, integer, integer, integer, integer) is
  'Segments clients (fidèles, inactifs, nouveaux) pour contexte IA V2 — agrégats sans PII';

revoke all on function public.get_ai_customer_insights(uuid, integer, integer, integer, integer) from public;
grant execute on function public.get_ai_customer_insights(uuid, integer, integer, integer, integer) to authenticated;
