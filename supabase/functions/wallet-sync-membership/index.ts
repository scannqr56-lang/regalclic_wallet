import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getGoogleAccessToken, processMembershipWalletSync } from "../_shared/wallet-sync-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Configuration manquante" }, 500);
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) {
    return jsonResponse({ error: "Non authentifié" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const membershipId = String(body.membership_id || "").trim();
  if (!membershipId) {
    return jsonResponse({ error: "membership_id requis" }, 400);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "Session invalide" }, 401);
  }

  // Vérification accès restaurateur via RLS
  const { data: membershipCheck, error: accessError } = await userClient
    .from("customer_memberships")
    .select("id")
    .eq("id", membershipId)
    .eq("status", "active")
    .maybeSingle();

  if (accessError) return jsonResponse({ error: accessError.message }, 500);
  if (!membershipCheck) {
    return jsonResponse({ error: "Carte introuvable ou accès refusé" }, 403);
  }

  try {
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const googleToken = await getGoogleAccessToken().catch(() => null);
    const result = await processMembershipWalletSync(admin, membershipId, {
      googleToken,
    });

    if (result.skipped) {
      return jsonResponse({ synced: true, skipped: true, message: "Aucune carte Wallet" });
    }

    if (!result.ok || !result.syncResult) {
      const parts = [
        result.syncResult?.google.error,
        result.syncResult?.apple.error,
      ].filter(Boolean);
      return jsonResponse({
        synced: false,
        error: parts.join(" | ") || "Synchronisation incomplète",
        details: result.syncResult,
        targets: result.targets,
      }, 502);
    }

    return jsonResponse({
      synced: true,
      google: result.syncResult.google,
      apple: result.syncResult.apple,
      targets: result.targets,
    });
  } catch (e) {
    return jsonResponse({
      error: e instanceof Error ? e.message : "Erreur inconnue",
    }, 500);
  }
});
