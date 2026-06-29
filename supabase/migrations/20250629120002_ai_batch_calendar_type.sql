-- Phase 9 : type de lot calendrier marketing
alter table public.ai_suggestion_batches
  drop constraint if exists ai_suggestion_batches_type_check;

alter table public.ai_suggestion_batches
  add constraint ai_suggestion_batches_type_check
  check (type in (
    'full_plan',
    'rewards_only',
    'offers_only',
    'notifications_only',
    'calendar_only'
  ));
