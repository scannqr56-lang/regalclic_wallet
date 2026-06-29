import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  activateWalletCampaign,
  deleteWalletCampaign,
  endWalletCampaign,
  expireDueWalletCampaigns,
  getCampaignNotifyQuotaStatus,
  notifyActiveCampaign,
  updateWalletCampaign,
} from "../_shared/wallet-campaign-core.ts";
import { getGoogleAccessToken } from "../_shared/wallet-sync-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wallet-sync-secret",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertCampaignAccess(
  userClient: ReturnType<typeof createClient>,
  campaignId: string,
) {
  const { data: campaign, error } = await userClient
    .from("wallet_campaigns")
    .select("id, business_id, status")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!campaign) throw new Error("Campagne introuvable ou accès refusé");
  return campaign;
}

function formatBroadcastMessage(broadcast: {
  total: number;
  google_ok: number;
  apple_ok: number;
  notification_sent: boolean;
}) {
  if (broadcast.total === 0) {
    return "Aucune carte Wallet active à mettre à jour";
  }
  const updated = broadcast.google_ok + broadcast.apple_ok;
  const base = `${updated} carte(s) mise(s) à jour sur ${broadcast.total}`;
  if (broadcast.notification_sent) {
    return `${base} — notification promo envoyée`;
  }
  return base;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const serviceSecret = Deno.env.get("WALLET_SYNC_SECRET") || "";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Configuration manquante" }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();
  const campaignId = String(body.campaign_id || "").trim();
  const membershipId = String(body.membership_id || "").trim();

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    if (action === "expire_due") {
      if (!serviceSecret || req.headers.get("x-wallet-sync-secret") !== serviceSecret) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const googleToken = await getGoogleAccessToken().catch(() => null);
      const expired = await expireDueWalletCampaigns(admin, googleToken);
      return jsonResponse({
        ok: true,
        expired_count: expired.length,
        results: expired,
      });
    }

    if (!supabaseAnonKey) {
      return jsonResponse({ error: "Configuration manquante" }, 500);
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse({ error: "Non authentifié" }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Session invalide" }, 401);

    if (action === "quota_status") {
      const businessId = String(body.business_id || "").trim();
      if (!businessId) return jsonResponse({ error: "business_id requis" }, 400);

      const { data: business, error } = await userClient
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!business) return jsonResponse({ error: "Accès refusé" }, 403);

      const quota = await getCampaignNotifyQuotaStatus(admin, businessId);
      return jsonResponse({ ok: true, quota });
    }

    if (!campaignId) return jsonResponse({ error: "campaign_id requis" }, 400);

    const campaignAccess = await assertCampaignAccess(userClient, campaignId);
    const googleToken = await getGoogleAccessToken().catch(() => null);

    if (action === "activate") {
      const result = await activateWalletCampaign(admin, campaignId, googleToken);
      return jsonResponse({
        ok: true,
        campaign: result.campaign,
        broadcast: result.broadcast,
        message: formatBroadcastMessage(result.broadcast),
      });
    }

    if (action === "end") {
      const result = await endWalletCampaign(admin, campaignId, googleToken);
      return jsonResponse({
        ok: true,
        campaign: result.campaign,
        broadcast: result.broadcast,
        message: formatBroadcastMessage(result.broadcast),
      });
    }

    if (action === "notify_all") {
      const result = await notifyActiveCampaign(admin, campaignId, googleToken);
      return jsonResponse({
        ok: true,
        campaign: result.campaign,
        broadcast: result.broadcast,
        message: formatBroadcastMessage(result.broadcast),
      });
    }

    if (action === "notify_test") {
      if (!membershipId) return jsonResponse({ error: "membership_id requis pour notify_test" }, 400);

      const { data: membership, error: membershipError } = await userClient
        .from("customer_memberships")
        .select("id")
        .eq("id", membershipId)
        .eq("business_id", campaignAccess.business_id)
        .maybeSingle();
      if (membershipError) throw new Error(membershipError.message);
      if (!membership) return jsonResponse({ error: "Carte introuvable ou accès refusé" }, 403);

      const result = await notifyActiveCampaign(admin, campaignId, googleToken, {
        membershipIds: [membershipId],
        skipQuotaCheck: true,
      });
      return jsonResponse({
        ok: true,
        campaign: result.campaign,
        broadcast: result.broadcast,
        message: result.broadcast.total === 0
          ? "Aucune carte Wallet active pour ce client"
          : formatBroadcastMessage(result.broadcast),
      });
    }

    if (action === "update") {
      const title = String(body.title || "").trim();
      const message = String(body.message || "").trim();
      const offerLabel = String(body.offer_label || "").trim() || null;
      const startsAt = String(body.starts_at || "").trim();
      const endsAt = String(body.ends_at || "").trim();
      const notifyOnActivate = Boolean(body.notify_on_activate);

      if (!title) return jsonResponse({ error: "Le titre est requis" }, 400);
      if (!message) return jsonResponse({ error: "Le message est requis" }, 400);
      if (!startsAt || !endsAt) return jsonResponse({ error: "Les dates sont requises" }, 400);

      const result = await updateWalletCampaign(admin, campaignId, {
        title,
        message,
        offer_label: offerLabel,
        notify_on_activate: notifyOnActivate,
        starts_at: startsAt,
        ends_at: endsAt,
      }, googleToken);

      return jsonResponse({
        ok: true,
        campaign: result.campaign,
        broadcast: result.broadcast ?? null,
        message: result.broadcast
          ? formatBroadcastMessage(result.broadcast)
          : "Campagne mise à jour",
      });
    }

    if (action === "delete") {
      const result = await deleteWalletCampaign(admin, campaignId, googleToken);
      return jsonResponse({
        ok: true,
        broadcast: result.broadcast ?? null,
        message: result.broadcast
          ? `Offre supprimée — ${formatBroadcastMessage(result.broadcast)}`
          : "Campagne supprimée",
      });
    }

    return jsonResponse({
      error: "action invalide (activate | end | notify_all | notify_test | update | delete | quota_status | expire_due)",
    }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return jsonResponse({ error: message }, 400);
  }
});
