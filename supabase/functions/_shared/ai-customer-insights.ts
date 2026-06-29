import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AiCustomerInsights = {
  segments: {
    all: number;
    loyal: number;
    inactive: number;
    new: number;
  };
  thresholds: {
    inactive_days: number;
    loyal_min_visits: number;
    loyal_window_days: number;
    new_days: number;
  };
  activity: {
    earn_transactions_30d: number;
  };
  pending_suggestions: {
    offers: number;
    notifications: number;
    total: number;
  };
  ready_this_week: number;
  data_source: string;
  version: string;
};

export async function fetchAiCustomerInsights(
  client: SupabaseClient,
  businessId: string,
): Promise<AiCustomerInsights | null> {
  const { data, error } = await client.rpc("get_ai_customer_insights", {
    p_business_id: businessId,
  });

  if (error) {
    console.error("[get_ai_customer_insights]", error.message);
    return null;
  }

  if (!data || typeof data !== "object") return null;
  return data as AiCustomerInsights;
}

export function formatCustomerInsightsForPrompt(
  insights: AiCustomerInsights | null | undefined,
): string | null {
  if (!insights?.segments) return null;

  const { segments, activity, thresholds } = insights;

  return [
    "Données clients réelles (agrégats anonymisés — adapter target_segment des suggestions) :",
    `- Clients actifs : ${segments.all}`,
    `- Fidèles (≥ ${thresholds.loyal_min_visits} visites / ${thresholds.loyal_window_days} j) : ${segments.loyal}`,
    `- Inactifs (> ${thresholds.inactive_days} j sans visite) : ${segments.inactive}`,
    `- Nouveaux (≤ ${thresholds.new_days} j) : ${segments.new}`,
    `- Scans / crédits fidélité (30 j) : ${activity.earn_transactions_30d}`,
    "Privilégier des offres ciblées inactive ou loyal quand les volumes le justifient.",
  ].join("\n");
}
