import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type UsageLogRow = {
  id: string;
  business_id: string;
  action: string;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_estimate: number | string | null;
  model_used: string | null;
  duration_ms: number | null;
  created_at: string;
  businesses: { name: string; slug: string | null } | null;
};

export type AiUsageSummary = {
  month: string;
  month_label: string;
  total_calls: number;
  total_tokens_input: number;
  total_tokens_output: number;
  total_cost_usd: number;
  alert_threshold_usd: number;
  alert_exceeded: boolean;
  by_action: Array<{
    action: string;
    calls: number;
    cost_usd: number;
    tokens_input: number;
    tokens_output: number;
  }>;
  by_business: Array<{
    business_id: string;
    business_name: string;
    business_slug: string | null;
    calls: number;
    cost_usd: number;
    tokens_input: number;
    tokens_output: number;
  }>;
  recent: Array<{
    id: string;
    business_id: string;
    business_name: string;
    action: string;
    cost_usd: number;
    model_used: string | null;
    duration_ms: number | null;
    created_at: string;
  }>;
};

function monthStartIso(date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function monthLabel(date = new Date()): string {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getAiMonthlyCostAlertUsd(): number {
  const raw = Deno.env.get("AI_MONTHLY_COST_ALERT_USD") || "50";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

export async function buildAiUsageSummary(
  admin: SupabaseClient,
): Promise<AiUsageSummary> {
  const now = new Date();
  const from = monthStartIso(now);
  const threshold = getAiMonthlyCostAlertUsd();

  const { data, error } = await admin
    .from("ai_usage_logs")
    .select(
      "id, business_id, action, tokens_input, tokens_output, cost_estimate, model_used, duration_ms, created_at, businesses(name, slug)",
    )
    .gte("created_at", from)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as UsageLogRow[];
  const byAction = new Map<string, {
    calls: number;
    cost_usd: number;
    tokens_input: number;
    tokens_output: number;
  }>();
  const byBusiness = new Map<string, {
    business_name: string;
    business_slug: string | null;
    calls: number;
    cost_usd: number;
    tokens_input: number;
    tokens_output: number;
  }>();

  let totalCost = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (const row of rows) {
    const cost = toNumber(row.cost_estimate);
    const tokensIn = toNumber(row.tokens_input);
    const tokensOut = toNumber(row.tokens_output);

    totalCost += cost;
    totalTokensIn += tokensIn;
    totalTokensOut += tokensOut;

    const actionStats = byAction.get(row.action) ?? {
      calls: 0,
      cost_usd: 0,
      tokens_input: 0,
      tokens_output: 0,
    };
    actionStats.calls += 1;
    actionStats.cost_usd += cost;
    actionStats.tokens_input += tokensIn;
    actionStats.tokens_output += tokensOut;
    byAction.set(row.action, actionStats);

    const businessStats = byBusiness.get(row.business_id) ?? {
      business_name: row.businesses?.name || "Commerce inconnu",
      business_slug: row.businesses?.slug ?? null,
      calls: 0,
      cost_usd: 0,
      tokens_input: 0,
      tokens_output: 0,
    };
    businessStats.calls += 1;
    businessStats.cost_usd += cost;
    businessStats.tokens_input += tokensIn;
    businessStats.tokens_output += tokensOut;
    byBusiness.set(row.business_id, businessStats);
  }

  return {
    month: from.slice(0, 7),
    month_label: monthLabel(now),
    total_calls: rows.length,
    total_tokens_input: totalTokensIn,
    total_tokens_output: totalTokensOut,
    total_cost_usd: Math.round(totalCost * 1_000_000) / 1_000_000,
    alert_threshold_usd: threshold,
    alert_exceeded: totalCost >= threshold,
    by_action: [...byAction.entries()]
      .map(([action, stats]) => ({ action, ...stats }))
      .sort((a, b) => b.cost_usd - a.cost_usd),
    by_business: [...byBusiness.entries()]
      .map(([business_id, stats]) => ({ business_id, ...stats }))
      .sort((a, b) => b.cost_usd - a.cost_usd),
    recent: rows.slice(0, 20).map((row) => ({
      id: row.id,
      business_id: row.business_id,
      business_name: row.businesses?.name || "Commerce inconnu",
      action: row.action,
      cost_usd: toNumber(row.cost_estimate),
      model_used: row.model_used,
      duration_ms: row.duration_ms,
      created_at: row.created_at,
    })),
  };
}
