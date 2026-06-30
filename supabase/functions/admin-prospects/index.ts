import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  sanitizeProspectListFilters,
  validateProspectAdminPatch,
} from "../_shared/sales-prospect-core.ts";

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

async function assertPlatformAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email administrateur manquant");

  await admin
    .from("platform_admins")
    .update({ user_id: userId })
    .eq("email", normalizedEmail)
    .is("user_id", null);

  const { data: byEmail, error: emailError } = await admin
    .from("platform_admins")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (emailError) throw new Error(emailError.message);

  const { data: byUser, error: userError } = await admin
    .from("platform_admins")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();
  if (userError) throw new Error(userError.message);

  if (!byEmail && !byUser) throw new Error("Accès administrateur refusé");
}

function applyListFilters(
  query: ReturnType<ReturnType<typeof createClient>["from"]>,
  filters: ReturnType<typeof sanitizeProspectListFilters>,
) {
  let q = query;
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.business_type) q = q.eq("business_type", filters.business_type);
  if (filters.commercial_code) q = q.ilike("commercial_code", `%${filters.commercial_code}%`);
  if (filters.interest_level) q = q.eq("interest_level", filters.interest_level);
  if (filters.search) {
    const term = `%${filters.search}%`;
    q = q.or(
      `business_name.ilike.${term},city.ilike.${term},contact_name.ilike.${term},email.ilike.${term},phone_mobile.ilike.${term},commercial_name.ilike.${term},commercial_code.ilike.${term}`,
    );
  }
  return q;
}

async function buildStats(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.from("sales_prospects").select("status, interest_level");
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return {
    total: rows.length,
    hot: rows.filter((r) => r.interest_level === "hot").length,
    to_follow_up: rows.filter((r) => r.status === "to_follow_up").length,
    demo_requested: rows.filter((r) => r.status === "demo_requested").length,
    signed: rows.filter((r) => r.status === "signed").length,
    interested: rows.filter((r) => r.status === "interested").length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration serveur incomplète" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return jsonResponse({ error: "Non authentifié" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Session invalide" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    await assertPlatformAdmin(admin, userData.user.id, userData.user.email || "");

    const url = new URL(req.url);

    if (req.method === "GET" && !url.searchParams.get("id")) {
      const filters = sanitizeProspectListFilters(url.searchParams);

      let listQuery = admin
        .from("sales_prospects")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(filters.offset, filters.offset + filters.limit - 1);

      listQuery = applyListFilters(listQuery, filters);

      const { data, error, count } = await listQuery;
      if (error) throw new Error(error.message);

      const stats = await buildStats(admin);

      return jsonResponse({
        prospects: data ?? [],
        total: count ?? 0,
        page: filters.page,
        limit: filters.limit,
        stats,
      });
    }

    if (req.method === "GET") {
      const id = url.searchParams.get("id")?.trim();
      if (!id) return jsonResponse({ error: "id requis" }, 400);

      const { data, error } = await admin
        .from("sales_prospects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return jsonResponse({ error: "Prospect introuvable" }, 404);

      return jsonResponse({ prospect: data });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const id = String(body.id || url.searchParams.get("id") || "").trim();
      if (!id) return jsonResponse({ error: "id requis" }, 400);

      const patch = validateProspectAdminPatch(body);

      const { data, error } = await admin
        .from("sales_prospects")
        .update(patch)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return jsonResponse({ error: "Prospect introuvable" }, 404);

      return jsonResponse({ ok: true, prospect: data });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "").trim();

      if (action === "quick_status") {
        const id = String(body.id || "").trim();
        const status = String(body.status || "").trim();
        if (!id || !status) return jsonResponse({ error: "id et status requis" }, 400);

        const patch = validateProspectAdminPatch({ status });
        const { data, error } = await admin
          .from("sales_prospects")
          .update(patch)
          .eq("id", id)
          .select("*")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) return jsonResponse({ error: "Prospect introuvable" }, 404);

        return jsonResponse({ ok: true, prospect: data });
      }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message.includes("refusé") || message.includes("authentifié")
      ? 403
      : message.includes("requis") || message.includes("invalide")
        ? 400
        : 500;
    return jsonResponse({ error: message }, status);
  }
});
