// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  getGoogleAccessToken,
  syncWalletForMembership,
  type WalletSyncResult,
} from "./wallet-sync-core.ts";

export type WalletCampaignRow = {
  id: string;
  business_id: string;
  title: string;
  message: string;
  offer_label: string | null;
  starts_at: string;
  ends_at: string;
  status: "draft" | "active" | "ended";
  notify_on_activate: boolean;
  activated_at: string | null;
  ended_at: string | null;
};

export type CampaignBroadcastOptions = {
  notify?: boolean;
  membershipIds?: string[];
  skipQuotaCheck?: boolean;
  notifyBatchId?: string;
};

export type CampaignBroadcastSummary = {
  campaign_id: string;
  total: number;
  google_ok: number;
  apple_ok: number;
  failed: number;
  skipped: number;
  notification_sent: boolean;
  notify_batch_id: string | null;
  logs: Array<{
    membership_id: string;
    google_synced: boolean;
    apple_synced: boolean;
    google_error: string | null;
    apple_error: string | null;
    notification_sent: boolean;
  }>;
};

export function getCampaignNotifyDailyQuota(): number {
  const raw = Deno.env.get("WALLET_CAMPAIGN_MAX_PER_DAY") || "1";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function startOfUtcDayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function countNotifyingBroadcastsToday(
  supabase: SupabaseClient,
  businessId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("wallet_campaign_broadcast_logs")
    .select("notify_batch_id")
    .eq("business_id", businessId)
    .eq("notification_sent", true)
    .not("notify_batch_id", "is", null)
    .gte("created_at", startOfUtcDayIso());

  if (error) throw error;
  const batchIds = new Set((data ?? []).map((row) => row.notify_batch_id as string));
  return batchIds.size;
}

export async function assertCampaignNotifyQuota(
  supabase: SupabaseClient,
  businessId: string,
): Promise<void> {
  const quota = getCampaignNotifyDailyQuota();
  const used = await countNotifyingBroadcastsToday(supabase, businessId);
  if (used >= quota) {
    throw new Error(
      `Quota de notifications promo atteint (${quota}/jour). Réessayez demain ou diffusez sans notification.`,
    );
  }
}

export async function getCampaignNotifyQuotaStatus(
  supabase: SupabaseClient,
  businessId: string,
) {
  const quota = getCampaignNotifyDailyQuota();
  const used = await countNotifyingBroadcastsToday(supabase, businessId);
  return {
    quota,
    used,
    remaining: Math.max(0, quota - used),
    blocked: used >= quota,
  };
}

async function loadCampaign(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<WalletCampaignRow | null> {
  const { data, error } = await supabase
    .from("wallet_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return data as WalletCampaignRow | null;
}

async function listWalletMembershipIds(
  supabase: SupabaseClient,
  businessId: string,
  filterIds?: string[],
): Promise<string[]> {
  let query = supabase
    .from("customer_memberships")
    .select("id, google_object_id, apple_serial_number")
    .eq("business_id", businessId)
    .eq("status", "active")
    .or("google_object_id.not.is.null,apple_serial_number.not.is.null");

  if (filterIds?.length) {
    query = query.in("id", filterIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string);
}

function summarizeSyncResult(result: WalletSyncResult, notifyAttempted: boolean) {
  const notificationSent = notifyAttempted && Boolean(
    result.notification?.sent_google || result.notification?.sent_apple,
  );
  return {
    google_synced: result.google.synced,
    apple_synced: result.apple.synced,
    google_error: result.google.error,
    apple_error: result.apple.error,
    notification_sent: notificationSent,
    skipped: !result.google.synced && !result.apple.synced
      && Boolean(result.google.error?.includes("Aucune carte") || result.apple.error?.includes("Aucune carte")),
  };
}

function campaignNotifyPayload(campaign: WalletCampaignRow) {
  return {
    message: campaign.message,
    offer_label: campaign.offer_label,
    title: campaign.title,
  };
}

export async function broadcastCampaignToMemberships(
  supabase: SupabaseClient,
  campaign: WalletCampaignRow,
  googleToken?: string | null,
  broadcastOptions: CampaignBroadcastOptions = {},
): Promise<CampaignBroadcastSummary> {
  const notify = Boolean(broadcastOptions.notify);
  const notifyBatchId = notify
    ? (broadcastOptions.notifyBatchId || crypto.randomUUID())
    : null;

  if (notify && !broadcastOptions.skipQuotaCheck) {
    await assertCampaignNotifyQuota(supabase, campaign.business_id);
  }

  const membershipIds = await listWalletMembershipIds(
    supabase,
    campaign.business_id,
    broadcastOptions.membershipIds,
  );
  const token = googleToken !== undefined ? googleToken : await getGoogleAccessToken().catch(() => null);

  const summary: CampaignBroadcastSummary = {
    campaign_id: campaign.id,
    total: membershipIds.length,
    google_ok: 0,
    apple_ok: 0,
    failed: 0,
    skipped: 0,
    notification_sent: notify,
    notify_batch_id: notifyBatchId,
    logs: [],
  };

  if (membershipIds.length === 0) {
    return summary;
  }

  const syncOptions = notify ? { campaignNotify: campaignNotifyPayload(campaign) } : undefined;

  for (const membershipId of membershipIds) {
    try {
      const syncResult = await syncWalletForMembership(supabase, membershipId, token, syncOptions);
      const row = summarizeSyncResult(syncResult, notify);

      if (row.google_synced) summary.google_ok += 1;
      if (row.apple_synced) summary.apple_ok += 1;
      if (row.skipped) summary.skipped += 1;
      if (!row.google_synced && !row.apple_synced && !row.skipped) summary.failed += 1;

      summary.logs.push({
        membership_id: membershipId,
        google_synced: row.google_synced,
        apple_synced: row.apple_synced,
        google_error: row.google_error,
        apple_error: row.apple_error,
        notification_sent: row.notification_sent,
      });

      await supabase.from("wallet_campaign_broadcast_logs").insert({
        campaign_id: campaign.id,
        membership_id: membershipId,
        business_id: campaign.business_id,
        google_synced: row.google_synced,
        apple_synced: row.apple_synced,
        google_error: row.google_error,
        apple_error: row.apple_error,
        notification_sent: notify,
        notify_batch_id: notifyBatchId,
      });
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      summary.logs.push({
        membership_id: membershipId,
        google_synced: false,
        apple_synced: false,
        google_error: message,
        apple_error: message,
        notification_sent: false,
      });
      await supabase.from("wallet_campaign_broadcast_logs").insert({
        campaign_id: campaign.id,
        membership_id: membershipId,
        business_id: campaign.business_id,
        google_synced: false,
        apple_synced: false,
        google_error: message,
        apple_error: message,
        notification_sent: notify,
        notify_batch_id: notifyBatchId,
      });
    }
  }

  return summary;
}

async function endOtherActiveCampaigns(
  supabase: SupabaseClient,
  businessId: string,
  exceptId?: string,
) {
  const now = new Date().toISOString();
  let query = supabase
    .from("wallet_campaigns")
    .update({ status: "ended", ended_at: now })
    .eq("business_id", businessId)
    .eq("status", "active");

  if (exceptId) {
    query = query.neq("id", exceptId);
  }

  await query;
}

async function syncBusinessPromoMessage(
  supabase: SupabaseClient,
  businessId: string,
  message: string | null,
) {
  await supabase
    .from("businesses")
    .update({ wallet_promo_message: message })
    .eq("id", businessId);
}

export async function activateWalletCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  googleToken?: string | null,
): Promise<{ campaign: WalletCampaignRow; broadcast: CampaignBroadcastSummary }> {
  const campaign = await loadCampaign(supabase, campaignId);
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status !== "draft") throw new Error("Seules les campagnes brouillon peuvent être activées");

  const now = new Date();
  const endsAt = new Date(campaign.ends_at);
  if (endsAt <= now) throw new Error("La date de fin est déjà passée");

  if (campaign.notify_on_activate) {
    await assertCampaignNotifyQuota(supabase, campaign.business_id);
  }

  const startsAt = new Date(campaign.starts_at);
  const effectiveStartsAt = startsAt > now ? now.toISOString() : campaign.starts_at;
  const activatedAt = now.toISOString();

  await endOtherActiveCampaigns(supabase, campaign.business_id, campaignId);

  const { data: updated, error } = await supabase
    .from("wallet_campaigns")
    .update({
      status: "active",
      starts_at: effectiveStartsAt,
      activated_at: activatedAt,
    })
    .eq("id", campaignId)
    .select("*")
    .single();

  if (error || !updated) throw error || new Error("Activation impossible");

  const activeCampaign = updated as WalletCampaignRow;
  await syncBusinessPromoMessage(supabase, activeCampaign.business_id, activeCampaign.message);

  const broadcast = await broadcastCampaignToMemberships(
    supabase,
    activeCampaign,
    googleToken,
    {
      notify: activeCampaign.notify_on_activate,
      skipQuotaCheck: true,
    },
  );
  return { campaign: activeCampaign, broadcast };
}

export async function notifyActiveCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  googleToken?: string | null,
  options?: { membershipIds?: string[]; skipQuotaCheck?: boolean },
): Promise<{ campaign: WalletCampaignRow; broadcast: CampaignBroadcastSummary }> {
  const campaign = await loadCampaign(supabase, campaignId);
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status !== "active") throw new Error("Seules les campagnes actives peuvent notifier");

  const broadcast = await broadcastCampaignToMemberships(
    supabase,
    campaign,
    googleToken,
    {
      notify: true,
      membershipIds: options?.membershipIds,
      skipQuotaCheck: options?.skipQuotaCheck,
    },
  );

  return { campaign, broadcast };
}

export type WalletCampaignUpdatePayload = {
  title: string;
  message: string;
  offer_label: string | null;
  notify_on_activate: boolean;
  starts_at: string;
  ends_at: string;
};

export async function updateWalletCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  payload: WalletCampaignUpdatePayload,
  googleToken?: string | null,
): Promise<{ campaign: WalletCampaignRow; broadcast?: CampaignBroadcastSummary }> {
  const campaign = await loadCampaign(supabase, campaignId);
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status === "ended") {
    throw new Error("Les campagnes terminées ne peuvent plus être modifiées");
  }

  const startsAt = new Date(payload.starts_at);
  const endsAt = new Date(payload.ends_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Dates invalides");
  }
  if (endsAt <= startsAt) throw new Error("La date de fin doit être après la date de début");
  if (campaign.status === "active" && endsAt <= new Date()) {
    throw new Error("La date de fin doit être dans le futur pour une campagne active");
  }

  const { data: updated, error } = await supabase
    .from("wallet_campaigns")
    .update({
      title: payload.title,
      message: payload.message,
      offer_label: payload.offer_label,
      notify_on_activate: payload.notify_on_activate,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
    })
    .eq("id", campaignId)
    .select("*")
    .single();

  if (error || !updated) throw error || new Error("Mise à jour impossible");

  const updatedCampaign = updated as WalletCampaignRow;

  if (updatedCampaign.status === "active") {
    await syncBusinessPromoMessage(supabase, updatedCampaign.business_id, updatedCampaign.message);
    const broadcast = await broadcastCampaignToMemberships(
      supabase,
      updatedCampaign,
      googleToken,
      { notify: false },
    );
    return { campaign: updatedCampaign, broadcast };
  }

  return { campaign: updatedCampaign };
}

export async function deleteWalletCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  googleToken?: string | null,
): Promise<{ broadcast?: CampaignBroadcastSummary }> {
  const campaign = await loadCampaign(supabase, campaignId);
  if (!campaign) throw new Error("Campagne introuvable");

  let broadcast: CampaignBroadcastSummary | undefined;

  if (campaign.status === "active") {
    const ended = await endWalletCampaign(supabase, campaignId, googleToken);
    broadcast = ended.broadcast;
  }

  const { error } = await supabase
    .from("wallet_campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) throw error;
  return { broadcast };
}

export async function endWalletCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  googleToken?: string | null,
): Promise<{ campaign: WalletCampaignRow; broadcast: CampaignBroadcastSummary }> {
  const campaign = await loadCampaign(supabase, campaignId);
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status !== "active") throw new Error("Seules les campagnes actives peuvent être terminées");

  const endedAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("wallet_campaigns")
    .update({ status: "ended", ended_at: endedAt })
    .eq("id", campaignId)
    .select("*")
    .single();

  if (error || !updated) throw error || new Error("Fin de campagne impossible");

  const endedCampaign = updated as WalletCampaignRow;

  const { data: business } = await supabase
    .from("businesses")
    .select("wallet_promo_message")
    .eq("id", endedCampaign.business_id)
    .maybeSingle();

  if (business?.wallet_promo_message === endedCampaign.message) {
    await syncBusinessPromoMessage(supabase, endedCampaign.business_id, null);
  }

  const broadcast = await broadcastCampaignToMemberships(
    supabase,
    endedCampaign,
    googleToken,
    { notify: false },
  );
  return { campaign: endedCampaign, broadcast };
}

export async function expireDueWalletCampaigns(
  supabase: SupabaseClient,
  googleToken?: string | null,
): Promise<Array<{ campaign_id: string; broadcast: CampaignBroadcastSummary }>> {
  const now = new Date().toISOString();
  const { data: dueCampaigns, error } = await supabase
    .from("wallet_campaigns")
    .select("*")
    .eq("status", "active")
    .lte("ends_at", now);

  if (error) throw error;
  if (!dueCampaigns?.length) return [];

  const results: Array<{ campaign_id: string; broadcast: CampaignBroadcastSummary }> = [];

  for (const row of dueCampaigns) {
    const ended = await endWalletCampaign(supabase, row.id, googleToken);
    results.push({ campaign_id: row.id, broadcast: ended.broadcast });
  }

  return results;
}
