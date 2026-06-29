import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  generateCalendarSuggestions,
  generateNotificationSuggestions,
  generateOfferSuggestions,
  generateRewardSuggestions,
} from "../_shared/ai-generate-suggestions-core.ts";
import { getAssistantQuotaSummary } from "../_shared/ai-quota-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Configuration manquante" }, 500);
  }

  const authHeader = req.headers.get("authorization") ||
    req.headers.get("Authorization") || "";
  if (!authHeader) {
    return jsonResponse({ error: "Non authentifié" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "Session invalide" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "rewards").trim();
  const businessId = String(body.business_id || "").trim();
  const menuUploadId = String(body.menu_upload_id || "").trim() || undefined;

  if (!businessId) {
    return jsonResponse({ error: "business_id requis" }, 400);
  }

  const { data: business, error: businessError } = await userClient
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    return jsonResponse({ error: businessError.message }, 500);
  }

  if (!business) {
    return jsonResponse({ error: "Accès refusé à ce commerce" }, 403);
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    if (action === "quota_status") {
      const quota = await getAssistantQuotaSummary(admin, businessId);
      return jsonResponse({ ok: true, quota });
    }

    if (action === "rewards") {
      const result = await generateRewardSuggestions(
        admin,
        userClient,
        businessId,
        user.id,
        menuUploadId,
      );

      return jsonResponse({
        ok: true,
        batch: result.batch,
        suggestions: result.suggestions,
        generated: result.generated,
      });
    }

    if (action === "offers") {
      const result = await generateOfferSuggestions(
        admin,
        userClient,
        businessId,
        user.id,
        menuUploadId,
      );

      return jsonResponse({
        ok: true,
        batch: result.batch,
        suggestions: result.suggestions,
        generated: result.generated,
      });
    }

    if (action === "notifications") {
      const result = await generateNotificationSuggestions(
        admin,
        userClient,
        businessId,
        user.id,
        menuUploadId,
      );

      return jsonResponse({
        ok: true,
        batch: result.batch,
        suggestions: result.suggestions,
        generated: result.generated,
      });
    }

    if (action === "calendar") {
      const result = await generateCalendarSuggestions(
        admin,
        userClient,
        businessId,
        user.id,
        menuUploadId,
      );

      return jsonResponse({
        ok: true,
        batch: result.batch,
        calendar_items: result.calendarItems,
        generated: result.generated,
      });
    }

    return jsonResponse({ error: "Action inconnue" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Génération impossible";
    return jsonResponse({ error: message }, 500);
  }
});
