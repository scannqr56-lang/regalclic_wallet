import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  BUSINESS_WALLET_SELECT,
  membershipRowsToWalletCardInput,
  MEMBERSHIP_WALLET_SELECT,
} from "../_shared/apple-pass-builder.ts";
import {
  GoogleWalletError,
  provisionGoogleWalletForDbInput,
} from "../_shared/google-wallet-core.ts";
import { fetchActiveWalletCampaign } from "../_shared/wallet-campaign-queries.ts";

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

async function loadWalletCardDbInput(
  admin: ReturnType<typeof createClient>,
  membershipId: string,
  businessSlug: string,
) {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select(BUSINESS_WALLET_SELECT)
    .eq("slug", businessSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (businessError) throw businessError;
  if (!business) throw new GoogleWalletError("Commerce introuvable", 404);

  const { data: membership, error: membershipError } = await admin
    .from("customer_memberships")
    .select(MEMBERSHIP_WALLET_SELECT)
    .eq("id", membershipId)
    .eq("business_id", business.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.qr_token) throw new GoogleWalletError("Carte introuvable", 404);

  const { data: lastTx } = await admin
    .from("loyalty_transactions")
    .select("created_at")
    .eq("membership_id", membership.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeCampaign = await fetchActiveWalletCampaign(admin, business.id);

  return membershipRowsToWalletCardInput(
    membership,
    business,
    lastTx?.created_at ?? null,
    activeCampaign,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration Supabase incomplète" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    let membershipId = "";
    let businessSlug = "";

    if (req.method === "GET") {
      const url = new URL(req.url);
      membershipId = url.searchParams.get("membership_id")?.trim() || "";
      businessSlug = url.searchParams.get("business_slug")?.trim() || "";
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      membershipId = String(body.membership_id || "").trim();
      businessSlug = String(body.business_slug || "").trim();
    } else {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!membershipId || !businessSlug) {
      return jsonResponse({ error: "membership_id et business_slug requis" }, 400);
    }

    const dbInput = await loadWalletCardDbInput(admin, membershipId, businessSlug);
    const { saveUrl, objectId, classId } = await provisionGoogleWalletForDbInput(dbInput);

    const now = new Date().toISOString();

    await admin
      .from("customer_memberships")
      .update({ google_object_id: objectId, updated_at: now })
      .eq("id", membershipId);

    await admin.from("wallet_passes").upsert({
      membership_id: membershipId,
      platform: "google",
      object_id: objectId,
      last_generated_at: now,
      last_updated_at: now,
      status: "active",
    }, { onConflict: "membership_id,platform" });

    return jsonResponse({ saveUrl, objectId, classId });
  } catch (error) {
    if (error instanceof GoogleWalletError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return jsonResponse({ error: message }, 400);
  }
});
