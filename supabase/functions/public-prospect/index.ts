import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateProspectCreatePayload } from "../_shared/sales-prospect-core.ts";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration serveur incomplète" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const row = validateProspectCreatePayload(body);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin
      .from("sales_prospects")
      .insert({
        ...row,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        user_agent: req.headers.get("user-agent")?.slice(0, 500) || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    // TODO: notifier l'admin par email si interest_level === 'hot'

    return jsonResponse({ ok: true, id: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message.includes("requis") || message.includes("invalide") || message.includes("Code commercial")
      ? 400
      : 500;
    return jsonResponse({ error: message }, status);
  }
});
