import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildAiUsageSummary } from "../_shared/ai-usage-summary.ts";

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
  if (!normalizedEmail) {
    throw new Error("Email administrateur manquant");
  }

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

  if (!byEmail && !byUser) {
    throw new Error("Accès administrateur refusé");
  }
}

async function assertMerchantActionAllowed(
  admin: ReturnType<typeof createClient>,
  userId: string,
  currentUserId: string,
  actionLabel: string,
) {
  if (userId === currentUserId) {
    throw new Error(`Impossible de ${actionLabel} votre propre compte admin`);
  }

  const { data: byUserId, error: userIdError } = await admin
    .from("platform_admins")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();

  if (userIdError) throw new Error(userIdError.message);
  if (byUserId) {
    throw new Error(`Impossible de ${actionLabel} un compte administrateur plateforme`);
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError) throw new Error(userError.message);

  const email = userData.user?.email?.trim().toLowerCase();
  if (email) {
    const { data: byEmail, error: emailError } = await admin
      .from("platform_admins")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (emailError) throw new Error(emailError.message);
    if (byEmail) {
      throw new Error(`Impossible de ${actionLabel} un compte administrateur plateforme`);
    }
  }
}

async function listMerchants(admin: ReturnType<typeof createClient>) {
  const { data: merchants, error } = await admin
    .from("merchant_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const userIds = (merchants ?? []).map((row) => row.user_id);
  let businessesByOwner: Record<string, Record<string, unknown>> = {};

  if (userIds.length) {
    const { data: businesses, error: businessError } = await admin
      .from("businesses")
      .select(
        "id, owner_id, name, slug, city, phone, is_active, plan, ai_trial_used, created_at, updated_at",
      )
      .in("owner_id", userIds);

    if (businessError) throw new Error(businessError.message);

    businessesByOwner = Object.fromEntries(
      (businesses ?? []).map((business) => [business.owner_id as string, business]),
    );
  }

  return (merchants ?? []).map((merchant) => ({
    ...merchant,
    business: businessesByOwner[merchant.user_id] ?? null,
  }));
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

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  try {
    await assertPlatformAdmin(admin, user.id, user.email || "");

    if (action === "list") {
      const merchants = await listMerchants(admin);
      return jsonResponse({ ok: true, merchants });
    }

    if (action === "ai_usage_summary") {
      const summary = await buildAiUsageSummary(admin);
      return jsonResponse({ ok: true, summary });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const displayName = String(body.display_name || "").trim() || null;
      const notes = String(body.notes || "").trim() || null;

      if (!email || !password) {
        return jsonResponse({ error: "Email et mot de passe requis" }, 400);
      }
      if (password.length < 8) {
        return jsonResponse({ error: "Mot de passe minimum 8 caractères" }, 400);
      }

      const { data: createdUser, error: createError } = await admin.auth.admin
        .createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: "merchant" },
        });

      if (createError) {
        throw new Error(createError.message);
      }
      if (!createdUser.user) {
        throw new Error("Création utilisateur échouée");
      }

      const { data: merchant, error: merchantError } = await admin
        .from("merchant_accounts")
        .insert({
          user_id: createdUser.user.id,
          email,
          display_name: displayName,
          notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (merchantError) {
        await admin.auth.admin.deleteUser(createdUser.user.id);
        throw new Error(merchantError.message);
      }

      return jsonResponse({
        ok: true,
        merchant: { ...merchant, business: null },
        credentials: { email, password },
      });
    }

    if (action === "update") {
      const userId = String(body.user_id || "").trim();
      if (!userId) return jsonResponse({ error: "user_id requis" }, 400);

      const merchantPatch: Record<string, unknown> = {};
      if (body.display_name !== undefined) {
        merchantPatch.display_name = String(body.display_name || "").trim() || null;
      }
      if (body.notes !== undefined) {
        merchantPatch.notes = String(body.notes || "").trim() || null;
      }

      if (Object.keys(merchantPatch).length) {
        const { error } = await admin
          .from("merchant_accounts")
          .update(merchantPatch)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      }

      if (body.password) {
        const password = String(body.password);
        if (password.length < 8) {
          return jsonResponse({ error: "Mot de passe minimum 8 caractères" }, 400);
        }
        const { error: passwordError } = await admin.auth.admin.updateUserById(
          userId,
          { password },
        );
        if (passwordError) throw new Error(passwordError.message);
      }

      const business = body.business;
      if (business?.id) {
        const businessPatch: Record<string, unknown> = {};
        const allowed = [
          "name",
          "slug",
          "address",
          "city",
          "postal_code",
          "phone",
          "website",
          "is_active",
          "plan",
          "ai_trial_used",
        ];
        for (const key of allowed) {
          if (business[key] !== undefined) businessPatch[key] = business[key];
        }
        if (Object.keys(businessPatch).length) {
          const { error: businessError } = await admin
            .from("businesses")
            .update(businessPatch)
            .eq("id", business.id)
            .eq("owner_id", userId);
          if (businessError) throw new Error(businessError.message);
        }
      }

      const merchants = await listMerchants(admin);
      const updated = merchants.find((row) => row.user_id === userId);
      return jsonResponse({ ok: true, merchant: updated ?? null });
    }

    if (action === "disable") {
      const userId = String(body.user_id || "").trim();
      const reason = String(body.reason || "").trim() || null;
      if (!userId) return jsonResponse({ error: "user_id requis" }, 400);

      await assertMerchantActionAllowed(admin, userId, user.id, "désactiver");

      const { error: merchantError } = await admin
        .from("merchant_accounts")
        .update({
          is_disabled: true,
          disabled_at: new Date().toISOString(),
          disabled_reason: reason,
        })
        .eq("user_id", userId);
      if (merchantError) throw new Error(merchantError.message);

      await admin
        .from("businesses")
        .update({ is_active: false })
        .eq("owner_id", userId);

      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });

      return jsonResponse({ ok: true });
    }

    if (action === "enable") {
      const userId = String(body.user_id || "").trim();
      if (!userId) return jsonResponse({ error: "user_id requis" }, 400);

      const { error: merchantError } = await admin
        .from("merchant_accounts")
        .update({
          is_disabled: false,
          disabled_at: null,
          disabled_reason: null,
        })
        .eq("user_id", userId);
      if (merchantError) throw new Error(merchantError.message);

      await admin
        .from("businesses")
        .update({ is_active: true })
        .eq("owner_id", userId);

      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });

      return jsonResponse({ ok: true });
    }

    if (action === "delete") {
      const userId = String(body.user_id || "").trim();
      if (!userId) return jsonResponse({ error: "user_id requis" }, 400);

      await assertMerchantActionAllowed(admin, userId, user.id, "supprimer");

      const { data: businesses, error: businessListError } = await admin
        .from("businesses")
        .select("id")
        .eq("owner_id", userId);
      if (businessListError) throw new Error(businessListError.message);

      for (const business of businesses ?? []) {
        const { error: deleteBusinessError } = await admin
          .from("businesses")
          .delete()
          .eq("id", business.id);
        if (deleteBusinessError) throw new Error(deleteBusinessError.message);
      }

      const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
      if (deleteUserError) throw new Error(deleteUserError.message);

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Action inconnue" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action impossible";
    const status = message.includes("refusé") ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }
});
