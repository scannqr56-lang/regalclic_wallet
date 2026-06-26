import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getGoogleAccessToken,
  isWalletSyncPartial,
  isWalletSyncSuccessful,
  processMembershipWalletSync,
} from "../_shared/wallet-sync-core.ts";

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
  const source = body.source === "manual" ? "manual" : "instant";

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
      source,
    });

    if (result.skipped) {
      return jsonResponse({
        synced: false,
        skipped: true,
        partial: false,
        message: "Aucune carte Wallet active sur un téléphone",
        targets: result.targets,
      });
    }

    const syncResult = result.syncResult!;
    const targetFlags = {
      hasGoogle: result.targets.hasGoogle,
      hasApple: result.targets.hasApple,
    };
    const synced = isWalletSyncSuccessful(syncResult, targetFlags);
    const partial = isWalletSyncPartial(syncResult, targetFlags);

    return jsonResponse({
      synced,
      skipped: false,
      partial,
      google: syncResult.google,
      apple: syncResult.apple,
      targets: result.targets,
      error: synced
        ? null
        : [syncResult.google.error, syncResult.apple.error].filter(Boolean).join(" | ") || null,
    }, 200);
  } catch (e) {
    return jsonResponse({
      error: e instanceof Error ? e.message : "Erreur inconnue",
    }, 500);
  }
});
