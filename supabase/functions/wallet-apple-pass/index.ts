import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  buildApplePkpass,
  membershipSerialNumber,
} from "../_shared/apple-pass-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

function pkpassResponse(fileBytes: Uint8Array, serialNumber: string) {
  return new Response(fileBytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `inline; filename="regalclic-${serialNumber}.pkpass"`,
      "X-Wallet-Serial": serialNumber,
    },
  });
}

type PassRequest = {
  membership_id?: string;
  business_slug?: string;
};

async function loadMembershipContext(
  admin: ReturnType<typeof createClient>,
  membershipId: string,
  businessSlug: string,
) {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id, name, slug, logo_url, primary_color, is_active")
    .eq("slug", businessSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (businessError) throw businessError;
  if (!business) throw new Error("Commerce introuvable");

  const { data: membership, error: membershipError } = await admin
    .from("customer_memberships")
    .select(`
      id,
      qr_token,
      points_balance,
      stamps_balance,
      rewards_available,
      apple_serial_number,
      apple_auth_token,
      status,
      customers ( first_name ),
      loyalty_programs ( type, reward_label )
    `)
    .eq("id", membershipId)
    .eq("business_id", business.id)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.qr_token) throw new Error("Carte introuvable");

  return { business, membership };
}

async function generatePass(
  admin: ReturnType<typeof createClient>,
  membershipId: string,
  businessSlug: string,
  supabaseUrl: string,
) {
  const { business, membership } = await loadMembershipContext(admin, membershipId, businessSlug);

  const passTypeIdentifier = Deno.env.get("APPLE_PASS_TYPE_IDENTIFIER") || "";
  const teamIdentifier = Deno.env.get("APPLE_TEAM_ID") || "";
  const organizationName = Deno.env.get("APPLE_ORGANIZATION_NAME") || "RegalClic";
  if (!passTypeIdentifier || !teamIdentifier) {
    throw new Error("Secrets Apple manquants (APPLE_PASS_TYPE_IDENTIFIER / APPLE_TEAM_ID)");
  }

  const serialNumber = membership.apple_serial_number || membershipSerialNumber(membership.id);
  const authToken = membership.apple_auth_token || crypto.randomUUID().replaceAll("-", "");

  const program = membership.loyalty_programs as { type?: string; reward_label?: string } | null;
  const customer = membership.customers as { first_name?: string } | null;
  const programType = program?.type === "stamps" ? "stamps" : "points";
  const balance = programType === "stamps"
    ? Number(membership.stamps_balance || 0)
    : Number(membership.points_balance || 0);

  const fileBytes = await buildApplePkpass({
    serialNumber,
    authToken,
    qrToken: membership.qr_token,
    businessName: business.name,
    customerFirstName: customer?.first_name || "Client",
    organizationName,
    programType,
    balance,
    rewardLabel: program?.reward_label || "Récompense",
    rewardsAvailable: Number(membership.rewards_available || 0),
    primaryColorHex: business.primary_color,
    businessLogoUrl: business.logo_url,
    webServiceURL: `${supabaseUrl}/functions/v1/wallet-apple-webhook`,
    passTypeIdentifier,
    teamIdentifier,
  });

  const now = new Date().toISOString();

  await admin
    .from("customer_memberships")
    .update({
      apple_serial_number: serialNumber,
      apple_auth_token: authToken,
      updated_at: now,
    })
    .eq("id", membership.id);

  await admin.from("wallet_passes").upsert({
    membership_id: membership.id,
    platform: "apple",
    serial_number: serialNumber,
    last_generated_at: now,
    last_updated_at: now,
    status: "active",
  }, { onConflict: "membership_id,platform" });

  return { fileBytes, serialNumber };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return textResponse("Configuration Supabase incomplète", 500);
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
      const body = (await req.json().catch(() => ({}))) as PassRequest;
      membershipId = String(body.membership_id || "").trim();
      businessSlug = String(body.business_slug || "").trim();
    } else {
      return textResponse("Method not allowed", 405);
    }

    if (!membershipId || !businessSlug) {
      return textResponse("membership_id et business_slug requis", 400);
    }

    const { fileBytes, serialNumber } = await generatePass(
      admin,
      membershipId,
      businessSlug,
      supabaseUrl,
    );

    return pkpassResponse(fileBytes, serialNumber);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const status = message.includes("introuvable") ? 404 : 400;
    return textResponse(message, status);
  }
});
