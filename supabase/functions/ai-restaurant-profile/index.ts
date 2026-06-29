import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  normalizeRestaurantProfileInput,
  profileInputToRow,
  validateRestaurantProfileInput,
} from "../_shared/ai-restaurant-profile-schema.ts";

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

  if (!supabaseUrl || !supabaseAnonKey) {
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
  const businessId = String(body.business_id || "").trim();
  const profileRaw = body.profile;

  if (!businessId) {
    return jsonResponse({ error: "business_id requis" }, 400);
  }

  if (!profileRaw || typeof profileRaw !== "object") {
    return jsonResponse({ error: "profile requis" }, 400);
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

  const profile = normalizeRestaurantProfileInput(profileRaw);
  const validationError = validateRestaurantProfileInput(profile);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const row = profileInputToRow(businessId, profile);

  const { data: existing, error: existingError } = await userClient
    .from("ai_restaurant_profiles")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: existingError.message }, 500);
  }

  let saved;
  if (existing?.id) {
    const { data, error } = await userClient
      .from("ai_restaurant_profiles")
      .update(row)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    saved = data;
  } else {
    const { data, error } = await userClient
      .from("ai_restaurant_profiles")
      .insert(row)
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    saved = data;
  }

  return jsonResponse({ ok: true, profile: saved });
});
