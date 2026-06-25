import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getGoogleAccessToken,
  processMembershipWalletSync,
} from "../_shared/wallet-sync-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wallet-sync-secret",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const serviceSecret = Deno.env.get("WALLET_SYNC_SECRET") || "";

  if (!supabaseUrl || !supabaseServiceRoleKey || !serviceSecret) {
    return jsonResponse({ error: "Configuration manquante" }, 500);
  }

  if (req.headers.get("x-wallet-sync-secret") !== serviceSecret) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: jobs, error } = await supabase.rpc("claim_wallet_sync_jobs", { p_limit: 20 });

    if (error) return jsonResponse({ error: error.message }, 500);
    if (!jobs?.length) {
      return jsonResponse({ processed: 0, failed: 0, skipped: 0, fetched: 0 });
    }

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const googleToken = await getGoogleAccessToken().catch(() => null);

    for (const job of jobs) {
      try {
        const result = await processMembershipWalletSync(supabase, job.membership_id, {
          googleToken,
        });

        if (result.skipped) {
          skipped += 1;
          continue;
        }

        if (!result.ok) {
          throw new Error("Synchronisation wallet incomplète");
        }

        processed += 1;
      } catch (jobError) {
        failed += 1;
        console.error("[wallet-sync-worker] Job failed", {
          job_id: job.id,
          membership_id: job.membership_id,
          reason: job.reason,
          error: jobError instanceof Error ? jobError.message : String(jobError),
        });
      }
    }

    return jsonResponse({ processed, failed, skipped, fetched: jobs.length });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});
