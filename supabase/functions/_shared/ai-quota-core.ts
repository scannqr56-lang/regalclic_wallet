import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type GenerationQuotaStatus = {
  allowed: boolean;
  reason?: string;
  plan: string;
  monthly_used: number;
  monthly_limit: number;
  trial_available: boolean;
};

export type UploadQuotaStatus = {
  allowed: boolean;
  reason?: string;
  plan: string;
  monthly_used: number;
  monthly_limit: number;
  trial_available: boolean;
};

export type AssistantQuotaSummary = {
  assistant_enabled: boolean;
  plan: string;
  plan_label: string;
  trial_available: boolean;
  generation: GenerationQuotaStatus;
  upload: UploadQuotaStatus;
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro_ia: "Pro IA",
  business: "Business",
};

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getGenerationMonthlyLimit(plan: string): number {
  if (plan === "business") {
    return Number(Deno.env.get("AI_MONTHLY_GENERATION_LIMIT_BUSINESS") || "20");
  }
  if (plan === "pro_ia") {
    return Number(Deno.env.get("AI_MONTHLY_GENERATION_LIMIT_PRO") || "5");
  }
  return Number(Deno.env.get("AI_MONTHLY_GENERATION_LIMIT_STARTER") || "0");
}

function getUploadMonthlyLimit(plan: string): number {
  if (plan === "business") {
    return Number(Deno.env.get("AI_MONTHLY_UPLOAD_LIMIT_BUSINESS") || "10");
  }
  if (plan === "pro_ia") {
    return Number(Deno.env.get("AI_MONTHLY_UPLOAD_LIMIT_PRO") || "2");
  }
  return Number(Deno.env.get("AI_MONTHLY_UPLOAD_LIMIT_STARTER") || "1");
}

async function loadBusinessPlan(
  admin: SupabaseClient,
  businessId: string,
): Promise<{ plan: string; ai_trial_used: boolean }> {
  const { data: business, error } = await admin
    .from("businesses")
    .select("plan, ai_trial_used")
    .eq("id", businessId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!business) throw new Error("Commerce introuvable");

  return {
    plan: String(business.plan || "starter"),
    ai_trial_used: Boolean(business.ai_trial_used),
  };
}

export function isAssistantEnabled(): boolean {
  const flag = (Deno.env.get("AI_ASSISTANT_ENABLED") || "true").toLowerCase();
  return flag !== "false" && flag !== "0";
}

export function assertAssistantEnabled(): void {
  if (!isAssistantEnabled()) {
    throw new Error("L'assistant IA est temporairement indisponible. Réessayez plus tard.");
  }
}

export async function getGenerationQuotaStatus(
  admin: SupabaseClient,
  businessId: string,
): Promise<GenerationQuotaStatus> {
  const { plan, ai_trial_used: trialUsed } = await loadBusinessPlan(admin, businessId);
  const trialAvailable = plan === "starter" && !trialUsed;

  const { count, error: countError } = await admin
    .from("ai_suggestion_batches")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", monthStartIso())
    .in("status", ["completed", "processing", "failed"]);

  if (countError) throw new Error(countError.message);

  const monthlyUsed = count ?? 0;
  const monthlyLimit = getGenerationMonthlyLimit(plan);

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
      reason: trialUsed
        ? "Essai utilisé — passez à Pro IA pour continuer."
        : "Essai gratuit déjà utilisé ce mois-ci — passez à Pro IA.",
      plan,
      monthly_used: monthlyUsed,
      monthly_limit: 1,
      trial_available: trialAvailable,
    };
  }

  if (monthlyUsed >= monthlyLimit) {
    return {
      allowed: false,
      reason: plan === "pro_ia"
        ? `Quota Pro IA atteint (${monthlyLimit} génération(s)/mois). Réessayez le mois prochain.`
        : `Quota mensuel atteint (${monthlyLimit} génération(s)).`,
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

export async function getUploadQuotaStatus(
  admin: SupabaseClient,
  businessId: string,
): Promise<UploadQuotaStatus> {
  const { plan, ai_trial_used: trialUsed } = await loadBusinessPlan(admin, businessId);
  const trialAvailable = plan === "starter" && !trialUsed;
  const monthlyLimit = getUploadMonthlyLimit(plan);

  if (plan === "starter") {
    const { count, error: countError } = await admin
      .from("ai_menu_uploads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (countError) throw new Error(countError.message);

    const totalUsed = count ?? 0;

    if (trialAvailable && totalUsed < 1) {
      return {
        allowed: true,
        plan,
        monthly_used: totalUsed,
        monthly_limit: 1,
        trial_available: true,
      };
    }

    return {
      allowed: false,
      reason: trialUsed || totalUsed >= 1
        ? "Essai utilisé — passez à Pro IA pour envoyer d'autres menus."
        : "Assistant IA réservé au plan Pro IA.",
      plan,
      monthly_used: totalUsed,
      monthly_limit: 1,
      trial_available: trialAvailable,
    };
  }

  const { count, error: countError } = await admin
    .from("ai_menu_uploads")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", monthStartIso());

  if (countError) throw new Error(countError.message);

  const monthlyUsed = count ?? 0;

  if (monthlyUsed >= monthlyLimit) {
    return {
      allowed: false,
      reason: plan === "pro_ia"
        ? `Quota d'uploads atteint (${monthlyLimit}/mois). Réessayez le mois prochain ou passez au plan Business.`
        : `Quota d'uploads atteint (${monthlyLimit}/mois).`,
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

export async function getAssistantQuotaSummary(
  admin: SupabaseClient,
  businessId: string,
): Promise<AssistantQuotaSummary> {
  const { plan, ai_trial_used: trialUsed } = await loadBusinessPlan(admin, businessId);
  const trialAvailable = plan === "starter" && !trialUsed;
  const generation = await getGenerationQuotaStatus(admin, businessId);
  const upload = await getUploadQuotaStatus(admin, businessId);

  return {
    assistant_enabled: isAssistantEnabled(),
    plan,
    plan_label: PLAN_LABELS[plan] || plan,
    trial_available: trialAvailable,
    generation,
    upload,
  };
}

export async function assertGenerationAllowed(
  admin: SupabaseClient,
  businessId: string,
): Promise<GenerationQuotaStatus> {
  assertAssistantEnabled();
  const quota = await getGenerationQuotaStatus(admin, businessId);
  if (!quota.allowed) {
    throw new Error(quota.reason || "Quota de génération atteint");
  }
  return quota;
}

export async function assertUploadAllowed(
  admin: SupabaseClient,
  businessId: string,
): Promise<UploadQuotaStatus> {
  assertAssistantEnabled();
  const quota = await getUploadQuotaStatus(admin, businessId);
  if (!quota.allowed) {
    throw new Error(quota.reason || "Quota d'upload atteint");
  }
  return quota;
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
