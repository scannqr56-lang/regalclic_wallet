// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { pushPassKitUpdates } from "./apple-apns.ts";
import {
  BUSINESS_WALLET_SELECT,
  membershipRowsToWalletCardInput,
} from "./apple-pass-builder.ts";
import {
  mergePassSyncSnapshots,
  resolveCampaignPromoNotificationPlan,
  resolveWalletNotificationPlan,
  type LastTransactionSnapshot,
} from "./wallet-notification-core.ts";
import { buildWalletCardViewModel } from "./wallet-card-model.ts";
import { fetchActiveWalletCampaign } from "./wallet-campaign-queries.ts";
import {
  buildGoogleSyncPatchBody,
  getGoogleAccessToken,
  patchGoogleLoyaltyObject,
  upsertGoogleClass,
} from "./google-wallet-core.ts";
import { googleWalletClassId } from "./wallet-branding.ts";

export const WALLET_SYNC_MAX_ATTEMPTS = 5;
export const WALLET_SYNC_BASE_BACKOFF_SEC = 30;

export type WalletSyncSource = "instant" | "worker" | "manual";

export type WalletSyncOptions = {
  /** Notification promo campagne (Phase 9) — remplace la notif transactionnelle */
  campaignNotify?: {
    message: string;
    offer_label?: string | null;
    title?: string;
  };
};

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
  notification?: {
    kind: string;
    sent_google: boolean;
    sent_apple: boolean;
  };
};

type MembershipRow = {
  id: string;
  business_id: string;
  card_number: string;
  qr_token: string;
  points_balance: number;
  stamps_balance: number;
  rewards_available: number;
  google_object_id: string | null;
  apple_serial_number: string | null;
  updated_at?: string | null;
  customers: { first_name?: string | null; last_name?: string | null } | null;
  loyalty_programs: {
    type?: string | null;
    reward_label?: string | null;
    points_per_euro?: number | null;
    stamps_required?: number | null;
    reward_threshold?: number | null;
  } | null;
  businesses: {
    id: string;
    name?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    wallet_label_color?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    phone?: string | null;
    website?: string | null;
    order_url?: string | null;
    instagram_url?: string | null;
    wallet_promo_message?: string | null;
    wallet_terms?: string | null;
    wallet_hero_url?: string | null;
  } | null;
};

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

async function fetchLastTransactionDetails(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<LastTransactionSnapshot> {
  const { data } = await supabase
    .from("loyalty_transactions")
    .select("type, points_delta, stamps_delta, rewards_delta, created_at")
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    type: data.type,
    points_delta: Number(data.points_delta || 0),
    stamps_delta: Number(data.stamps_delta || 0),
    rewards_delta: Number(data.rewards_delta || 0),
    created_at: data.created_at,
  };
}

async function loadWalletPassSnapshots(supabase: SupabaseClient, membershipId: string) {
  const { data } = await supabase
    .from("wallet_passes")
    .select("platform, last_synced_balance, last_synced_rewards_available, pending_notification")
    .eq("membership_id", membershipId);
  return data ?? [];
}

async function persistWalletPassSnapshots(
  supabase: SupabaseClient,
  membershipId: string,
  balance: number,
  rewardsAvailable: number,
) {
  const now = new Date().toISOString();
  await supabase
    .from("wallet_passes")
    .update({
      last_synced_balance: balance,
      last_synced_rewards_available: rewardsAvailable,
      last_updated_at: now,
    })
    .eq("membership_id", membershipId)
    .in("platform", ["apple", "google"]);
}

function resolveSyncStatus(
  result: WalletSyncResult,
  targets: { hasGoogle: boolean; hasApple: boolean },
  skipped: boolean,
): "success" | "partial" | "failed" | "skipped" {
  if (skipped) return "skipped";
  const googleOk = !targets.hasGoogle || result.google.synced;
  const appleOk = !targets.hasApple || result.apple.synced;
  if (googleOk && appleOk) return "success";
  if (result.google.synced || result.apple.synced) return "partial";
  return "failed";
}

export async function logWalletSync(
  supabase: SupabaseClient,
  params: {
    membershipId: string;
    businessId: string;
    source: WalletSyncSource;
    result: WalletSyncResult;
    targets: { hasGoogle: boolean; hasApple: boolean };
    skipped: boolean;
    notificationKind?: string;
    notificationSent?: boolean;
  },
): Promise<void> {
  const status = resolveSyncStatus(params.result, params.targets, params.skipped);
  const { error } = await supabase.from("wallet_sync_logs").insert({
    membership_id: params.membershipId,
    business_id: params.businessId,
    source: params.source,
    status,
    google_synced: params.result.google.synced,
    apple_synced: params.result.apple.synced,
    google_error: params.result.google.error,
    apple_error: params.result.apple.error,
    apple_push_tokens: params.result.apple.push_tokens,
    notification_sent: Boolean(params.notificationSent),
    notification_kind: params.notificationKind && params.notificationKind !== "none"
      ? params.notificationKind
      : null,
    details: {
      apns_sent: params.result.apple.apns_sent,
      apns_failed: params.result.apple.apns_failed,
      targets: params.targets,
      notification: params.result.notification ?? null,
    },
  });
  if (error) {
    console.error("[wallet-sync] log insert failed", error.message);
  }
}

export async function releaseSyncJobForRetry(
  supabase: SupabaseClient,
  jobId: string,
  attemptCount: number,
  errorMessage: string,
): Promise<void> {
  const nextAttempt = attemptCount + 1;
  const backoffSec = Math.min(300, WALLET_SYNC_BASE_BACKOFF_SEC * (2 ** attemptCount));
  const nextRetryAt = new Date(Date.now() + backoffSec * 1000).toISOString();

  if (nextAttempt >= WALLET_SYNC_MAX_ATTEMPTS) {
    await supabase
      .from("wallet_sync_jobs")
      .update({
        attempt_count: nextAttempt,
        last_error: `Abandon après ${WALLET_SYNC_MAX_ATTEMPTS} tentatives: ${errorMessage}`,
        processed_at: new Date().toISOString(),
        locked_at: null,
        next_retry_at: null,
      })
      .eq("id", jobId);
    return;
  }

  await supabase
    .from("wallet_sync_jobs")
    .update({
      attempt_count: nextAttempt,
      last_error: errorMessage,
      next_retry_at: nextRetryAt,
      locked_at: null,
    })
    .eq("id", jobId);
}

export async function syncWalletForMembership(
  supabase: SupabaseClient,
  membershipId: string,
  googleToken?: string | null,
  options?: WalletSyncOptions,
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
      card_number,
      qr_token,
      points_balance,
      stamps_balance,
      rewards_available,
      google_object_id,
      apple_serial_number,
      updated_at,
      customers ( first_name, last_name ),
      loyalty_programs ( type, reward_label, points_per_euro, stamps_required, reward_threshold ),
      businesses ( ${BUSINESS_WALLET_SELECT} )
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
    result.google.error = "Aucune carte Google Wallet";
    result.apple.error = row.apple_serial_number && !hasAppleWallet
      ? "Carte Apple non installée sur un appareil (ré-ajoutez-la depuis Wallet)"
      : "Aucune carte Apple Wallet";
    return result;
  }

  const now = new Date().toISOString();
  const token = googleToken !== undefined ? googleToken : await getGoogleAccessToken().catch(() => null);
  const [lastTransaction, passSnapshots] = await Promise.all([
    fetchLastTransactionDetails(supabase, membershipId),
    loadWalletPassSnapshots(supabase, membershipId),
  ]);
  const lastTransactionAt = lastTransaction?.created_at ?? null;
  const syncSnapshot = mergePassSyncSnapshots(passSnapshots);

  const business = row.businesses;
  const activeCampaign = business?.id
    ? await fetchActiveWalletCampaign(supabase, business.id)
    : null;
  const dbInput = membershipRowsToWalletCardInput(row, business, lastTransactionAt, activeCampaign);
  const vm = buildWalletCardViewModel(dbInput);
  const notificationPlan = options?.campaignNotify
    ? resolveCampaignPromoNotificationPlan(vm, options.campaignNotify)
    : resolveWalletNotificationPlan(vm, syncSnapshot, lastTransaction);

  result.notification = {
    kind: notificationPlan.kind,
    sent_google: false,
    sent_apple: false,
  };

  if (hasGoogleWallet && row.google_object_id) {
    const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID") || "";
    if (!token) {
      result.google.error = "Google token indisponible";
    } else if (!issuerId) {
      result.google.error = "GOOGLE_WALLET_ISSUER_ID manquant";
    } else {
      try {
        if (!business?.id) {
          result.google.error = "Commerce introuvable";
        } else {
          const classId = googleWalletClassId(issuerId, vm.businessId);
          await upsertGoogleClass(token, classId, vm);
          const patchBody = buildGoogleSyncPatchBody(
            vm,
            notificationPlan.notifyGoogle ? notificationPlan : undefined,
          );
          await patchGoogleLoyaltyObject(token, row.google_object_id, patchBody);
          result.google.synced = true;
          if (notificationPlan.notifyGoogle) {
            result.notification.sent_google = true;
          }

          await supabase
            .from("wallet_passes")
            .update({ last_updated_at: now })
            .eq("membership_id", membershipId)
            .eq("platform", "google");
        }
      } catch (syncError) {
        result.google.error = syncError instanceof Error ? syncError.message : String(syncError);
      }
    }
  }

  if (hasAppleWallet) {
    if (notificationPlan.notifyApple) {
      await supabase
        .from("wallet_passes")
        .update({
          pending_notification: notificationPlan.apple,
          last_updated_at: now,
        })
        .eq("membership_id", membershipId)
        .eq("platform", "apple");
    } else {
      await supabase
        .from("wallet_passes")
        .update({ last_updated_at: now })
        .eq("membership_id", membershipId)
        .eq("platform", "apple");
    }

    const apnsResult = await pushPassKitUpdates(pushTokens);
    result.apple.apns_sent = apnsResult.sent;
    result.apple.apns_failed = apnsResult.failed;

    if (apnsResult.failed > 0 && apnsResult.sent === 0) {
      result.apple.error = `APNs échec: ${apnsResult.errors.join("; ")}`;
    } else {
      result.apple.synced = true;
      if (notificationPlan.notifyApple && apnsResult.sent > 0) {
        result.notification.sent_apple = true;
      }
      if (apnsResult.failed > 0) {
        result.apple.error = `APNs partiel: ${apnsResult.errors.join("; ")}`;
      }
    }
  }

  if (result.google.synced || result.apple.synced) {
    await persistWalletPassSnapshots(
      supabase,
      membershipId,
      vm.balance,
      vm.rewardsAvailable,
    );
  }

  return result;
}

export async function markWalletSyncJobProcessed(
  supabase: SupabaseClient,
  jobId: string,
) {
  await supabase
    .from("wallet_sync_jobs")
    .update({ processed_at: new Date().toISOString(), locked_at: null })
    .eq("id", jobId);
}

export async function markPendingJobsProcessedForMembership(
  supabase: SupabaseClient,
  membershipId: string,
) {
  await supabase
    .from("wallet_sync_jobs")
    .update({
      processed_at: new Date().toISOString(),
      locked_at: null,
      next_retry_at: null,
    })
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

export function isWalletSyncPartial(
  result: WalletSyncResult,
  targets: { hasGoogle: boolean; hasApple: boolean },
): boolean {
  if (!targets.hasGoogle && !targets.hasApple) return false;
  const anySynced = result.google.synced || result.apple.synced;
  return anySynced && !isWalletSyncSuccessful(result, targets);
}

export async function resolveWalletSyncTargets(
  supabase: SupabaseClient,
  membershipId: string,
) {
  const { data: membership } = await supabase
    .from("customer_memberships")
    .select("id, business_id, google_object_id, apple_serial_number")
    .eq("id", membershipId)
    .maybeSingle();

  if (!membership) {
    return { membership: null, hasGoogle: false, hasApple: false, skipped: true, businessId: null };
  }

  const pushTokens = await fetchApplePushTokens(supabase, membership.apple_serial_number);
  const hasGoogle = Boolean(membership.google_object_id);
  const hasApple = pushTokens.length > 0;

  if (!hasGoogle && !hasApple) {
    return {
      membership,
      hasGoogle: false,
      hasApple: false,
      skipped: true,
      businessId: membership.business_id as string,
    };
  }

  return {
    membership,
    hasGoogle,
    hasApple,
    skipped: false,
    businessId: membership.business_id as string,
  };
}

export async function processMembershipWalletSync(
  supabase: SupabaseClient,
  membershipId: string,
  options?: {
    googleToken?: string | null;
    source?: WalletSyncSource;
    jobId?: string;
  },
) {
  const source = options?.source ?? "instant";
  const targets = await resolveWalletSyncTargets(supabase, membershipId);

  if (targets.skipped || !targets.membership) {
    await markPendingJobsProcessedForMembership(supabase, membershipId);
    const emptyResult: WalletSyncResult = {
      membership_id: membershipId,
      google: { synced: false, error: null },
      apple: { synced: false, push_tokens: 0, apns_sent: 0, apns_failed: 0, error: null },
    };
    if (targets.businessId) {
      await logWalletSync(supabase, {
        membershipId,
        businessId: targets.businessId,
        source,
        result: emptyResult,
        targets: { hasGoogle: false, hasApple: false },
        skipped: true,
      });
    }
    return {
      ok: true,
      skipped: true,
      partial: false,
      syncResult: emptyResult,
      membership: targets.membership,
      targets,
    };
  }

  const syncResult = await syncWalletForMembership(
    supabase,
    membershipId,
    options?.googleToken,
  );

  const targetFlags = { hasGoogle: targets.hasGoogle, hasApple: targets.hasApple };
  const ok = isWalletSyncSuccessful(syncResult, targetFlags);
  const partial = isWalletSyncPartial(syncResult, targetFlags);

  if (targets.businessId) {
    const notif = syncResult.notification;
    await logWalletSync(supabase, {
      membershipId,
      businessId: targets.businessId,
      source,
      result: syncResult,
      targets: targetFlags,
      skipped: false,
      notificationKind: notif?.kind,
      notificationSent: Boolean(notif && notif.kind !== "none" && (notif.sent_google || notif.sent_apple)),
    });
  }

  if (ok) {
    await markPendingJobsProcessedForMembership(supabase, membershipId);
  }

  return {
    ok,
    skipped: false,
    partial,
    syncResult,
    membership: targets.membership,
    targets: targetFlags,
  };
}

export { getGoogleAccessToken };
