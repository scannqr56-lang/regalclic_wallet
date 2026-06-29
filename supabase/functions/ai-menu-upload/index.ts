import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  AI_MENU_ALLOWED_MIME_TYPES,
  AI_MENU_BUCKET,
  AI_MENU_MAX_SIZE_BYTES,
  buildMenuStoragePath,
  isAllowedMenuMimeType,
} from "../_shared/ai-menu-constants.ts";

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

function normalizeMimeType(file: File): string {
  const declared = (file.type || "").toLowerCase().trim();
  if (declared) return declared;

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
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

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return jsonResponse({ error: "Corps multipart invalide" }, 400);
  }

  const businessId = String(formData.get("business_id") || "").trim();
  const fileEntry = formData.get("file");

  if (!businessId) {
    return jsonResponse({ error: "business_id requis" }, 400);
  }

  if (!(fileEntry instanceof File)) {
    return jsonResponse({ error: "Fichier menu requis" }, 400);
  }

  const mimeType = normalizeMimeType(fileEntry);
  if (!isAllowedMenuMimeType(mimeType)) {
    return jsonResponse({
      error: `Format non supporté. Formats acceptés : ${AI_MENU_ALLOWED_MIME_TYPES.join(", ")}`,
    }, 400);
  }

  if (fileEntry.size <= 0) {
    return jsonResponse({ error: "Fichier vide" }, 400);
  }

  if (fileEntry.size > AI_MENU_MAX_SIZE_BYTES) {
    const maxMb = Math.round(AI_MENU_MAX_SIZE_BYTES / (1024 * 1024));
    return jsonResponse({
      error: `Fichier trop volumineux (max ${maxMb} Mo)`,
    }, 400);
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

  const uploadId = crypto.randomUUID();
  const storagePath = buildMenuStoragePath(businessId, uploadId, mimeType);
  const fileBuffer = await fileEntry.arrayBuffer();

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { error: storageError } = await admin.storage
    .from(AI_MENU_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (storageError) {
    return jsonResponse({
      error: storageError.message || "Upload storage impossible",
    }, 500);
  }

  const { data: row, error: insertError } = await userClient
    .from("ai_menu_uploads")
    .insert({
      id: uploadId,
      business_id: businessId,
      uploaded_by: user.id,
      storage_path: storagePath,
      file_name: fileEntry.name || `menu.${mimeType.split("/")[1]}`,
      file_type: mimeType,
      file_size: fileEntry.size,
      status: "uploaded",
    })
    .select()
    .single();

  if (insertError) {
    await admin.storage.from(AI_MENU_BUCKET).remove([storagePath]);
    return jsonResponse({
      error: insertError.message || "Enregistrement impossible",
    }, 500);
  }

  return jsonResponse({ ok: true, upload: row });
});
