import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildPkpassFromSerial } from "../_shared/apple-pass-builder.ts";

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

function noContentResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function getPathSegments(req: Request) {
  const { pathname } = new URL(req.url);
  const marker = "/wallet-apple-webhook";
  const suffix = pathname.includes(marker)
    ? pathname.slice(pathname.indexOf(marker) + marker.length)
    : pathname;
  return suffix.split("/").filter(Boolean);
}

function parsePassesUpdatedSince(tag: string | null): Date | null {
  if (!tag) return null;
  const asNumber = Number(tag);
  if (!Number.isNaN(asNumber) && asNumber > 0) return new Date(asNumber * 1000);
  const asDate = new Date(tag);
  return Number.isNaN(asDate.getTime()) ? null : asDate;
}

function toPassKitTag(isoDate: string): string {
  return String(Math.floor(new Date(isoDate).getTime() / 1000));
}

async function requirePassAuth(
  supabase: ReturnType<typeof createClient>,
  expectedPassTypeIdentifier: string,
  passTypeIdentifier: string,
  serialNumber: string,
  authHeader: string,
) {
  if (expectedPassTypeIdentifier && passTypeIdentifier !== expectedPassTypeIdentifier) {
    return { error: jsonResponse({ error: "Pass type identifier invalide" }, 404) };
  }

  const match = authHeader.match(/^ApplePass\s+(.+)$/i);
  if (!match) {
    return { error: jsonResponse({ error: "Authorization ApplePass manquante" }, 401) };
  }
  const providedToken = match[1].trim();

  const { data: membership, error } = await supabase
    .from("customer_memberships")
    .select("id, apple_auth_token, updated_at")
    .eq("apple_serial_number", serialNumber)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { error: jsonResponse({ error: error.message }, 500) };
  if (!membership) return { error: jsonResponse({ error: "Pass introuvable" }, 404) };
  if (!membership.apple_auth_token || membership.apple_auth_token !== providedToken) {
    return { error: jsonResponse({ error: "Token ApplePass invalide" }, 401) };
  }

  return { membership };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration manquante" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";

  try {
    const passTypeIdentifierEnv = Deno.env.get("APPLE_PASS_TYPE_IDENTIFIER") || "";
    const segments = getPathSegments(req);

    if (req.method === "GET" && segments.length === 0) {
      return jsonResponse({
        status: "ok",
        message: "PassKit web service actif (RegalClic Wallet V1).",
      });
    }

    // POST register device
    if (
      req.method === "POST" &&
      segments.length === 6 &&
      segments[0] === "v1" &&
      segments[1] === "devices" &&
      segments[3] === "registrations"
    ) {
      const [, , deviceLibraryIdentifier, , passTypeIdentifier, serialNumber] = segments;
      const authResult = await requirePassAuth(
        supabase,
        passTypeIdentifierEnv,
        passTypeIdentifier,
        serialNumber,
        authHeader,
      );
      if ("error" in authResult) return authResult.error;

      const payload = await req.json().catch(() => ({}));
      const pushToken = typeof payload?.pushToken === "string" ? payload.pushToken : null;
      const now = new Date().toISOString();

      const { error: upsertError } = await supabase
        .from("apple_wallet_registrations")
        .upsert({
          membership_id: authResult.membership.id,
          device_library_identifier: deviceLibraryIdentifier,
          push_token: pushToken,
          pass_type_identifier: passTypeIdentifier,
          serial_number: serialNumber,
          updated_at: now,
        }, { onConflict: "device_library_identifier,serial_number" });

      if (upsertError) return jsonResponse({ error: upsertError.message }, 500);

      await supabase
        .from("wallet_passes")
        .update({ last_updated_at: now })
        .eq("membership_id", authResult.membership.id)
        .eq("platform", "apple");

      return jsonResponse({ registered: true }, 201);
    }

    // DELETE unregister device
    if (
      req.method === "DELETE" &&
      segments.length === 6 &&
      segments[0] === "v1" &&
      segments[1] === "devices" &&
      segments[3] === "registrations"
    ) {
      const [, , deviceLibraryIdentifier, , passTypeIdentifier, serialNumber] = segments;
      const authResult = await requirePassAuth(
        supabase,
        passTypeIdentifierEnv,
        passTypeIdentifier,
        serialNumber,
        authHeader,
      );
      if ("error" in authResult) return authResult.error;

      await supabase
        .from("apple_wallet_registrations")
        .delete()
        .eq("device_library_identifier", deviceLibraryIdentifier)
        .eq("serial_number", serialNumber);

      return noContentResponse();
    }

    // GET updated serials for device
    if (
      req.method === "GET" &&
      segments.length === 5 &&
      segments[0] === "v1" &&
      segments[1] === "devices" &&
      segments[3] === "registrations"
    ) {
      const [, , deviceLibraryIdentifier, , passTypeIdentifier] = segments;
      if (passTypeIdentifierEnv && passTypeIdentifier !== passTypeIdentifierEnv) {
        return jsonResponse({ error: "Pass type identifier invalide" }, 404);
      }

      const url = new URL(req.url);
      const sinceDate = parsePassesUpdatedSince(url.searchParams.get("passesUpdatedSince"));

      const { data: registrations, error: regError } = await supabase
        .from("apple_wallet_registrations")
        .select("serial_number, membership_id")
        .eq("device_library_identifier", deviceLibraryIdentifier)
        .eq("pass_type_identifier", passTypeIdentifier);
      if (regError) return jsonResponse({ error: regError.message }, 500);
      if (!registrations?.length) return noContentResponse();

      const membershipIds = registrations.map((r) => r.membership_id);
      const { data: memberships, error: memError } = await supabase
        .from("customer_memberships")
        .select("id, apple_serial_number, updated_at")
        .in("id", membershipIds);
      if (memError) return jsonResponse({ error: memError.message }, 500);

      const membershipById = new Map((memberships || []).map((m) => [m.id, m]));
      let lastUpdatedIso = "1970-01-01T00:00:00.000Z";
      const serialNumbers: string[] = [];

      for (const reg of registrations) {
        const membership = membershipById.get(reg.membership_id);
        if (!membership?.apple_serial_number || !membership.updated_at) continue;
        if (sinceDate && new Date(membership.updated_at) <= sinceDate) continue;
        serialNumbers.push(membership.apple_serial_number);
        if (new Date(membership.updated_at) > new Date(lastUpdatedIso)) {
          lastUpdatedIso = membership.updated_at;
        }
      }

      if (!serialNumbers.length) return noContentResponse();

      return jsonResponse({
        serialNumbers,
        lastUpdated: toPassKitTag(lastUpdatedIso),
      });
    }

    // GET latest pass file
    if (
      req.method === "GET" &&
      segments.length === 4 &&
      segments[0] === "v1" &&
      segments[1] === "passes"
    ) {
      const [, , passTypeIdentifier, serialNumber] = segments;
      const authResult = await requirePassAuth(
        supabase,
        passTypeIdentifierEnv,
        passTypeIdentifier,
        serialNumber,
        authHeader,
      );
      if ("error" in authResult) return authResult.error;

      const ifModifiedSince = req.headers.get("if-modified-since");
      if (ifModifiedSince && authResult.membership.updated_at) {
        const modifiedAt = new Date(authResult.membership.updated_at);
        const since = new Date(ifModifiedSince);
        if (!Number.isNaN(since.getTime()) && modifiedAt <= since) {
          return noContentResponse();
        }
      }

      const fileBytes = await buildPkpassFromSerial(supabase, serialNumber, supabaseUrl);
      const lastModified = authResult.membership.updated_at || new Date().toISOString();

      return new Response(fileBytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.pkpass",
          "Last-Modified": new Date(lastModified).toUTCString(),
        },
      });
    }

    // POST log
    if (req.method === "POST" && segments.length === 2 && segments[0] === "v1" && segments[1] === "log") {
      const payload = await req.json().catch(() => ({}));
      console.log("[wallet-apple-webhook] Apple device log", payload);
      return noContentResponse();
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erreur inconnue" }, 500);
  }
});
