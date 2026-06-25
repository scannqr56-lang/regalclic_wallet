import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

type JoinBody = {
  business_slug?: string;
  first_name?: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  consent?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration serveur incomplète" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const membershipId = url.searchParams.get("membership_id")?.trim();
    const businessSlug = url.searchParams.get("business_slug")?.trim();

    if (!membershipId || !businessSlug) {
      return jsonResponse({ error: "Paramètres manquants" }, 400);
    }

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id, name, slug, logo_url, primary_color, is_active")
      .eq("slug", businessSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (businessError) throw businessError;
    if (!business) return jsonResponse({ error: "Commerce introuvable" }, 404);

    const { data: membership, error: membershipError } = await admin
      .from("customer_memberships")
      .select(`
        id,
        card_number,
        points_balance,
        stamps_balance,
        rewards_available,
        status,
        business_id,
        loyalty_program_id,
        customers ( first_name, last_name ),
        loyalty_programs ( type, reward_label, points_per_euro, stamps_required, reward_threshold )
      `)
      .eq("id", membershipId)
      .eq("business_id", business.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) return jsonResponse({ error: "Carte introuvable" }, 404);

    return jsonResponse({
      business,
      membership: {
        id: membership.id,
        card_number: membership.card_number,
        points_balance: membership.points_balance,
        stamps_balance: membership.stamps_balance,
        rewards_available: membership.rewards_available,
        customer: membership.customers,
        loyalty_program: membership.loyalty_programs,
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = (await req.json().catch(() => ({}))) as JoinBody;
  const businessSlug = String(body.business_slug || "").trim();
  const firstName = String(body.first_name || "").trim();

  if (!businessSlug || !firstName) {
    return jsonResponse({ error: "Commerce et prénom requis" }, 400);
  }

  if (body.consent !== true) {
    return jsonResponse({ error: "Le consentement est requis" }, 400);
  }

  const { data, error } = await admin.rpc("create_public_membership", {
    p_business_slug: businessSlug,
    p_first_name: firstName,
    p_last_name: body.last_name ? String(body.last_name).trim() : null,
    p_phone: body.phone ? String(body.phone).trim() : null,
    p_email: body.email ? String(body.email).trim() : null,
    p_consent: true,
  });

  if (error) {
    const message = error.message || "Inscription impossible";
    const status = message.includes("introuvable") ? 404 : 400;
    return jsonResponse({ error: message }, status);
  }

  return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return jsonResponse({ error: message }, 500);
  }
});
