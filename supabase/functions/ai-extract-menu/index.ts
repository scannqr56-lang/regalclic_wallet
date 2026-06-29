import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  extractMenuUpload,
  saveManualMenuExtraction,
} from "../_shared/ai-extract-menu-core.ts";

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
  const action = String(body.action || "extract").trim();
  const menuUploadId = String(body.menu_upload_id || "").trim();

  if (!menuUploadId) {
    return jsonResponse({ error: "menu_upload_id requis" }, 400);
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    if (action === "extract") {
      const result = await extractMenuUpload(admin, userClient, menuUploadId, user.id);
      return jsonResponse({
        ok: true,
        upload: result.upload,
        extracted: result.extracted,
      });
    }

    if (action === "save_manual") {
      if (!body.extracted_json) {
        return jsonResponse({ error: "extracted_json requis" }, 400);
      }

      const result = await saveManualMenuExtraction(
        userClient,
        menuUploadId,
        body.extracted_json,
      );
      return jsonResponse({
        ok: true,
        upload: result.upload,
        extracted: result.extracted,
      });
    }

    return jsonResponse({ error: "Action inconnue" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur extraction";
    return jsonResponse({ error: message }, 500);
  }
});
