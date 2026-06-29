-- Script support : activer Pro IA ou réinitialiser l'essai Starter
-- Usage (remplacer les valeurs) :
--
--   psql ... -v business_slug='chb' -v new_plan='pro_ia' -f scripts/set-business-ai-plan.sql
--
-- Plans valides : starter | pro_ia | business

update public.businesses
set
  plan = coalesce(nullif(:'new_plan', ''), plan),
  ai_trial_used = case
    when :'reset_trial' = 'true' then false
    else ai_trial_used
  end,
  updated_at = now()
where slug = :'business_slug';

-- Vérification
select slug, name, plan, ai_trial_used
from public.businesses
where slug = :'business_slug';
