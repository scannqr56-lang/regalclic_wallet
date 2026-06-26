/**
 * Notifications Wallet — plans Apple (changeMessage + APNs) et Google (TEXT_AND_NOTIFY).
 * Les mises à jour silencieuses rafraîchissent la carte sans message lock-screen.
 */

import type { ApplePassFieldSet } from "./wallet-card-model.ts";
import type { WalletCardViewModel } from "./wallet-card-model.ts";
import {
  deriveWalletUpdateContext,
  type WalletNotificationMode,
  type WalletUpdateContext,
  type WalletUpdateReason,
} from "./wallet-update-core.ts";

export type WalletTransactionType =
  | "earn_points"
  | "earn_stamp"
  | "redeem_reward"
  | "manual_adjustment"
  | string;

export type LastTransactionSnapshot = {
  type: WalletTransactionType;
  points_delta: number;
  stamps_delta: number;
  rewards_delta: number;
  created_at: string;
} | null;

export type WalletPassSyncSnapshot = {
  last_synced_balance: number | null;
  last_synced_rewards_available: number | null;
};

export type WalletNotificationKind =
  | "none"
  | "balance_earned"
  | "stamp_earned"
  | "reward_unlocked"
  | "balance_updated"
  | "campaign_promo";

export type AppleNotificationHints = {
  notifyBalance: boolean;
  notifyReward: boolean;
  notifyPromo?: boolean;
  balanceChangeMessage?: string;
  rewardChangeMessage?: string;
  promoChangeMessage?: string;
};

export type GoogleNotificationPayload = {
  notify: boolean;
  header: string;
  body: string;
  kind: WalletNotificationKind;
};

export type WalletNotificationPlan = {
  kind: WalletNotificationKind;
  notifyGoogle: boolean;
  notifyApple: boolean;
  google: GoogleNotificationPayload;
  apple: AppleNotificationHints;
  updateReason?: WalletUpdateReason;
  notificationMode?: WalletNotificationMode;
};

const SILENT_PLAN: WalletNotificationPlan = {
  kind: "none",
  notifyGoogle: false,
  notifyApple: false,
  google: { notify: false, header: "", body: "", kind: "none" },
  apple: { notifyBalance: false, notifyReward: false },
  notificationMode: "silent",
};

function withContext(
  plan: WalletNotificationPlan,
  ctx: WalletUpdateContext,
): WalletNotificationPlan {
  return {
    ...plan,
    updateReason: ctx.reason,
    notificationMode: ctx.notificationMode,
  };
}

function buildRewardUnlockedVisiblePlan(vm: WalletCardViewModel): WalletNotificationPlan {
  const count = vm.rewardsAvailable;
  const rewardLabel = vm.rewardLabel.toLowerCase();
  const body = count === 1
    ? `Vous avez une ${rewardLabel} à utiliser !`
    : `Vous avez ${count} récompenses à utiliser !`;

  return {
    kind: "reward_unlocked",
    notifyGoogle: true,
    notifyApple: true,
    google: {
      notify: true,
      header: "Récompense disponible",
      body,
      kind: "reward_unlocked",
    },
    apple: {
      notifyBalance: false,
      notifyReward: true,
      rewardChangeMessage: count === 1 ? "Vous avez %@" : "Vous avez %@",
    },
    notificationMode: "notify",
  };
}

/**
 * Point d'entrée unique : décide silent vs notify pour une sync membership.
 */
export function resolveWalletSyncPlan(
  vm: WalletCardViewModel,
  snapshot: WalletPassSyncSnapshot,
  lastTransaction: LastTransactionSnapshot,
  options?: {
    campaignNotify?: { message: string; offer_label?: string | null; title?: string };
    updateReason?: WalletUpdateReason;
    notificationMode?: WalletNotificationMode;
  },
): WalletNotificationPlan {
  if (options?.campaignNotify) {
    return resolveCampaignPromoNotificationPlan(vm, options.campaignNotify);
  }

  if (options?.updateReason && options?.notificationMode) {
    const ctx: WalletUpdateContext = {
      reason: options.updateReason,
      notificationMode: options.notificationMode,
    };
    if (options.notificationMode === "silent") {
      return withContext(SILENT_PLAN, ctx);
    }
    if (options.updateReason === "reward_unlocked") {
      return withContext(buildRewardUnlockedVisiblePlan(vm), ctx);
    }
    return withContext(SILENT_PLAN, ctx);
  }

  return resolveWalletNotificationPlan(vm, snapshot, lastTransaction);
}

function resolveWalletNotificationPlan(
  vm: WalletCardViewModel,
  snapshot: WalletPassSyncSnapshot,
  lastTransaction: LastTransactionSnapshot,
): WalletNotificationPlan {
  const ctx = deriveWalletUpdateContext(lastTransaction, snapshot, vm);

  if (ctx.notificationMode === "silent") {
    return withContext(SILENT_PLAN, ctx);
  }

  if (ctx.reason === "reward_unlocked") {
    return withContext(buildRewardUnlockedVisiblePlan(vm), ctx);
  }

  return withContext(SILENT_PLAN, ctx);
}

export function resolveCampaignPromoNotificationPlan(
  vm: WalletCardViewModel,
  campaign: { message: string; offer_label?: string | null; title?: string },
): WalletNotificationPlan {
  const body = (campaign.message || vm.promoMessage || "").trim();
  const header = (campaign.offer_label || "").trim() || "Offre spéciale";

  return {
    kind: "campaign_promo",
    notifyGoogle: Boolean(body),
    notifyApple: Boolean(body),
    updateReason: "promo_offer",
    notificationMode: "notify",
    google: {
      notify: Boolean(body),
      header,
      body,
      kind: "campaign_promo",
    },
    apple: {
      notifyBalance: false,
      notifyReward: false,
      notifyPromo: Boolean(body),
      promoChangeMessage: "Nouvelle offre : %@",
    },
  };
}

export function applyAppleNotificationHints(
  fields: ApplePassFieldSet,
  hints: AppleNotificationHints | null,
): void {
  const balanceField = fields.primaryFields.find((f) => f.key === "balance");
  if (balanceField) {
    if (hints?.notifyBalance && hints.balanceChangeMessage) {
      balanceField.changeMessage = hints.balanceChangeMessage;
    } else {
      delete balanceField.changeMessage;
    }
  }

  const rewardField = fields.auxiliaryFields.find((f) => f.key === "available");
  if (rewardField) {
    if (hints?.notifyReward && hints.rewardChangeMessage) {
      rewardField.changeMessage = hints.rewardChangeMessage;
    } else {
      delete rewardField.changeMessage;
    }
  }

  const taglineField = fields.auxiliaryFields.find((f) => f.key === "tagline");
  if (taglineField) {
    if (hints?.notifyPromo && hints.promoChangeMessage) {
      taglineField.changeMessage = hints.promoChangeMessage;
    } else {
      delete taglineField.changeMessage;
    }
  }

  const backPromoField = fields.backFields.find((f) => f.key === "promo");
  if (backPromoField) {
    if (hints?.notifyPromo && hints.promoChangeMessage) {
      backPromoField.changeMessage = hints.promoChangeMessage;
    } else {
      delete backPromoField.changeMessage;
    }
  }
}

export function mergePassSyncSnapshots(
  passes: Array<{ platform: string; last_synced_balance: number | null; last_synced_rewards_available: number | null }>,
): WalletPassSyncSnapshot {
  const row = passes.find((p) => p.last_synced_balance !== null) || passes[0];
  return {
    last_synced_balance: row?.last_synced_balance ?? null,
    last_synced_rewards_available: row?.last_synced_rewards_available ?? null,
  };
}
