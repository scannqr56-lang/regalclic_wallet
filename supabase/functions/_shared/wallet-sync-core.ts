// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { pushPassKitUpdates } from "./apple-apns.ts";
import {
  buildGoogleSyncPatchBody,
  getGoogleAccessToken,
  patchGoogleLoyaltyObject,
  type GoogleMembershipContext,
} from "./google-wallet-core.ts";

export type WalletSyncResult = {
  membership_id: string;
  google: { synced: boolean; error: string | null };
  apple: {
    synced: boolean;
    push_tokens: number;
    apns_sent: number;
    apns_failed: number;
    error: string | null;
  };
};

type MembershipRow = {
  id: string;
  business_id: string;
  points_balance: number;
  stamps_balance: number;
  rewards_available: number;
  google_object_id: string | null;
  apple_serial_number: string | null;
  qr_token: string;
  card_number: string;
  customers: { first_name?: string } | null;
  loyalty_programs: { type?: string; reward_label?: string } | null;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  } | null;
};

function toGoogleContext(row: MembershipRow): GoogleMembershipContext {
  const programType = row.loyalty_programs?.type === "stamps" ? "stamps" : "points";
  const balance = programType === "stamps"
    ? Number(row.stamps_balance || 0)
    : Number(row.points_balance || 0);

  return {
    membershipId: row.id,
    businessId: row.business_id,
    businessName: row.businesses?.name || "Commerce",
    businessLogoUrl: row.businesses?.logo_url ?? null,
    primaryColorHex: row.businesses?.primary_color ?? null,
    customerFirstName: row.customers?.first_name || "Client",
    cardNumber: row.card_number,
    qrToken: row.qr_token,
    programType,
    balance,
    rewardLabel: row.loyalty_programs?.reward_label || "Récompense",
    rewardsAvailable: Number(row.rewards_available || 0),
  };
}

async function fetchApplePushTokens(
  supabase: SupabaseClient,
  serialNumber: string | null,
): Promise<string[]> {
  if (!serialNumber) return [];

  const { data: registrations } = await supabase
    .from("apple_wallet_registrations")
    .select("push_token")
    .eq("serial_number", serialNumber)
    .not("push_token", "is", null);

  return (registrations || [])
    .map((r) => r.push_token)
    .filter(Boolean) as string[];
}

export async function syncWalletForMembership(
  supabase: SupabaseClient,
  membershipId: string,
  googleToken?: string | null,
): Promise<WalletSyncResult> {
  const result: WalletSyncResult = {
    membership_id: membershipId,
    google: { synced: false, error: null },
    apple: { synced: false, push_tokens: 0, apns_sent: 0, apns_failed: 0, error: null },
  };

  const { data: membership, error } = await supabase
    .from("customer_memberships")
    .select(`
      id,
      business_id,
      points_balance,
      stamps_balance,
      rewards_available,
      google_object_id,
      apple_serial_number,
      qr_token,
      card_number,
      customers ( first_name ),
      loyalty_programs ( type, reward_label ),
      businesses ( id, name, logo_url, primary_color )
    `)
    .eq("id", membershipId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership) {
    result.google.error = "Membership introuvable";
    result.apple.error = "Membership introuvable";
    return result;
  }

  const row = membership as MembershipRow;
  const pushTokens = await fetchApplePushTokens(supabase, row.apple_serial_number);
  const hasGoogleWallet = Boolean(row.google_object_id);
  const hasAppleWallet = pushTokens.length > 0;

  result.apple.push_tokens = pushTokens.length;

  if (!hasGoogleWallet && !hasAppleWallet) {
    result.google.error = hasGoogleWallet ? null : "Aucune carte Google Wallet";
    result.apple.error = row.apple_serial_number && !hasAppleWallet
      ? "Carte Apple non installée sur un appareil (ré-ajoutez-la depuis Wallet)"
      : "Aucune carte Apple Wallet";
    return result;
  }

  const now = new Date().toISOString();
  const token = googleToken !== undefined ? googleToken : await getGoogleAccessToken().catch(() => null);

  if (hasGoogleWallet && row.google_object_id) {
    const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID") || "";
    if (!token) {
      result.google.error = "Google token indisponible";
    } else if (!issuerId) {
      result.google.error = "GOOGLE_WALLET_ISSUER_ID manquant";
    } else {
      try {
        const patchBody = buildGoogleSyncPatchBody(toGoogleContext(row), issuerId);
        await patchGoogleLoyaltyObject(token, row.google_object_id, patchBody);
        result.google.synced = true;

        await supabase
          .from("wallet_passes")
          .update({ last_updated_at: now })
          .eq("membership_id", membershipId)
          .eq("platform", "google");
      } catch (syncError) {
        result.google.error = syncError instanceof Error ? syncError.message : String(syncError);
      }
    }
  }

  if (hasAppleWallet) {
    await supabase
      .from("wallet_passes")
      .update({ last_updated_at: now })
      .eq("membership_id", membershipId)
      .eq("platform", "apple");

    const apnsResult = await pushPassKitUpdates(pushTokens);
    result.apple.apns_sent = apnsResult.sent;
    result.apple.apns_failed = apnsResult.failed;

    if (apnsResult.failed > 0 && apnsResult.sent === 0) {
      result.apple.error = `APNs échec: ${apnsResult.errors.join("; ")}`;
    } else {
      result.apple.synced = true;
      if (apnsResult.failed > 0) {
        result.apple.error = `APNs partiel: ${apnsResult.errors.join("; ")}`;
      }
    }
  }

  return result;
}

export async function markWalletSyncJobProcessed(
  supabase: SupabaseClient,
  jobId: string,
) {
  await supabase
    .from("wallet_sync_jobs")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", jobId);
}

export async function markPendingJobsProcessedForMembership(
  supabase: SupabaseClient,
  membershipId: string,
) {
  await supabase
    .from("wallet_sync_jobs")
    .update({ processed_at: new Date().toISOString() })
    .eq("membership_id", membershipId)
    .is("processed_at", null);
}

export function isWalletSyncSuccessful(
  result: WalletSyncResult,
  targets: { hasGoogle: boolean; hasApple: boolean },
): boolean {
  const googleOk = !targets.hasGoogle || result.google.synced;
  const appleOk = !targets.hasApple || result.apple.synced;
  return googleOk && appleOk;
}

export async function resolveWalletSyncTargets(
  supabase: SupabaseClient,
  membershipId: string,
) {
  const { data: membership } = await supabase
    .from("customer_memberships")
    .select("google_object_id, apple_serial_number")
    .eq("id", membershipId)
    .maybeSingle();

  if (!membership) {
    return { membership: null, hasGoogle: false, hasApple: false, skipped: true };
  }

  const pushTokens = await fetchApplePushTokens(supabase, membership.apple_serial_number);
  const hasGoogle = Boolean(membership.google_object_id);
  const hasApple = pushTokens.length > 0;

  if (!hasGoogle && !hasApple) {
    return { membership, hasGoogle: false, hasApple: false, skipped: true };
  }

  return { membership, hasGoogle, hasApple, skipped: false };
}

export async function processMembershipWalletSync(
  supabase: SupabaseClient,
  membershipId: string,
  options?: { googleToken?: string | null; strict?: boolean },
) {
  const targets = await resolveWalletSyncTargets(supabase, membershipId);

  if (targets.skipped || !targets.membership) {
    await markPendingJobsProcessedForMembership(supabase, membershipId);
    return {
      ok: true,
      skipped: true,
      syncResult: null,
      membership: targets.membership,
      targets,
    };
  }

  const syncResult = await syncWalletForMembership(
    supabase,
    membershipId,
    options?.googleToken,
  );

  const ok = isWalletSyncSuccessful(syncResult, {
    hasGoogle: targets.hasGoogle,
    hasApple: targets.hasApple,
  });

  if (ok) {
    await markPendingJobsProcessedForMembership(supabase, membershipId);
  }

  return {
    ok,
    skipped: false,
    syncResult,
    membership: targets.membership,
    targets,
  };
}

export { getGoogleAccessToken };
