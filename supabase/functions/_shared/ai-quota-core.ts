import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type GenerationQuotaStatus = {
  allowed: boolean;
  reason?: string;
  plan: string;
  monthly_used: number;
  monthly_limit: number;
  trial_available: boolean;
};

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getMonthlyLimit(plan: string): number {
  if (plan === "business") {
    return Number(Deno.env.get("AI_MONTHLY_GENERATION_LIMIT_BUSINESS") || "20");
  }
  if (plan === "pro_ia") {
    return Number(Deno.env.get("AI_MONTHLY_GENERATION_LIMIT_PRO") || "5");
  }
  return Number(Deno.env.get("AI_MONTHLY_GENERATION_LIMIT_STARTER") || "0");
}

export async function getGenerationQuotaStatus(
  admin: SupabaseClient,
  businessId: string,
): Promise<GenerationQuotaStatus> {
  const { data: business, error } = await admin
    .from("businesses")
    .select("plan, ai_trial_used")
    .eq("id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!business) throw new Error("Commerce introuvable");

  const plan = String(business.plan || "starter");
  const trialAvailable = plan === "starter" && !business.ai_trial_used;

  const { count, error: countError } = await admin
    .from("ai_suggestion_batches")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", monthStartIso())
    .in("status", ["completed", "processing", "failed"]);

  if (countError) throw new Error(countError.message);

  const monthlyUsed = count ?? 0;
  const monthlyLimit = getMonthlyLimit(plan);

  if (plan === "starter") {
    if (trialAvailable && monthlyUsed < 1) {
      return {
        allowed: true,
        plan,
        monthly_used: monthlyUsed,
        monthly_limit: 1,
        trial_available: true,
      };
    }
    return {
      allowed: false,
      reason: trialAvailable
        ? "Essai gratuit déjà utilisé ce mois-ci"
        : "Assistant IA réservé au plan Pro IA — essai gratuit consommé",
      plan,
      monthly_used: monthlyUsed,
      monthly_limit: 1,
      trial_available: trialAvailable,
    };
  }

  if (monthlyUsed >= monthlyLimit) {
    return {
      allowed: false,
      reason: `Quota mensuel atteint (${monthlyLimit} génération(s))`,
      plan,
      monthly_used: monthlyUsed,
      monthly_limit: monthlyLimit,
      trial_available: false,
    };
  }

  return {
    allowed: true,
    plan,
    monthly_used: monthlyUsed,
    monthly_limit: monthlyLimit,
    trial_available: false,
  };
}

export async function markStarterTrialUsedIfNeeded(
  admin: SupabaseClient,
  businessId: string,
  plan: string,
): Promise<void> {
  if (plan !== "starter") return;

  await admin
    .from("businesses")
    .update({ ai_trial_used: true })
    .eq("id", businessId)
    .eq("ai_trial_used", false);
}

export function isAssistantEnabled(): boolean {
  const flag = (Deno.env.get("AI_ASSISTANT_ENABLED") || "true").toLowerCase();
  return flag !== "false" && flag !== "0";
}
