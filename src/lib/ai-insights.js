import { supabase } from '@/lib/supabase';

/** Segments clients réels (V2 preview) — agrégats sans PII. */
export async function fetchAiCustomerInsights(businessId) {
  const { data, error } = await supabase.rpc('get_ai_customer_insights', {
    p_business_id: businessId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export const SEGMENT_LABELS = {
  all: 'Tous les clients',
  loyal: 'Clients fidèles',
  inactive: 'Clients inactifs',
  new: 'Nouveaux clients',
};

export function formatSegmentSummary(insights) {
  if (!insights?.segments) return null;
  const { segments, thresholds } = insights;
  return {
    segments,
    thresholds,
    hasActivity: (insights.activity?.earn_transactions_30d ?? 0) > 0,
  };
}
