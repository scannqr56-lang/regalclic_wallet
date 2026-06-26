/**
 * Politique de mise à jour Wallet : sépare mise à jour des données vs notification visible.
 *
 * | reason              | notificationMode (défaut) |
 * |---------------------|---------------------------|
 * | points_added        | silent                    |
 * | stamps_added        | silent                    |
 * | reward_redeemed     | silent                    |
 * | manual_adjustment   | silent                    |
 * | technical_sync      | silent                    |
 * | reward_unlocked     | silent (WALLET_NOTIFY_REWARD_UNLOCKED=true → notify) |
 * | promo_offer         | notify                    |
 * | manual_card_update  | notify                    |
 */

import type { WalletCardViewModel } from "./wallet-card-model.ts";
import type {
  LastTransactionSnapshot,
  WalletPassSyncSnapshot,
} from "./wallet-notification-core.ts";

export type WalletUpdateReason =
  | "points_added"
  | "stamps_added"
  | "reward_unlocked"
  | "reward_redeemed"
  | "promo_offer"
  | "manual_card_update"
  | "technical_sync"
  | "manual_adjustment";

export type WalletNotificationMode = "silent" | "notify";

export type WalletUpdateContext = {
  reason: WalletUpdateReason;
  notificationMode: WalletNotificationMode;
};

export type UpdateWalletForMembershipParams = {
  membershipId: string;
  reason: WalletUpdateReason;
  notificationMode: WalletNotificationMode;
  message?: string;
  offerLabel?: string | null;
  metadata?: Record<string, unknown>;
};

export function getDefaultNotificationMode(reason: WalletUpdateReason): WalletNotificationMode {
  if (reason === "promo_offer" || reason === "manual_card_update") {
    return "notify";
  }
  if (reason === "reward_unlocked") {
    return Deno.env.get("WALLET_NOTIFY_REWARD_UNLOCKED") === "true" ? "notify" : "silent";
  }
  return "silent";
}

export function isRewardUnlockedEvent(
  lastTransaction: LastTransactionSnapshot,
  snapshot: WalletPassSyncSnapshot,
  vm: Pick<WalletCardViewModel, "rewardsAvailable">,
): boolean {
  const prevRewards = snapshot.last_synced_rewards_available;
  const rewardsIncreased = prevRewards !== null && vm.rewardsAvailable > prevRewards;
  const rewardUnlockedFromTx = Boolean(lastTransaction && lastTransaction.rewards_delta > 0);
  return rewardUnlockedFromTx || rewardsIncreased;
}

export function mapTransactionTypeToReason(
  txType: string | null | undefined,
): WalletUpdateReason {
  switch (txType) {
    case "earn_points":
      return "points_added";
    case "earn_stamp":
      return "stamps_added";
    case "redeem_reward":
      return "reward_redeemed";
    case "manual_adjustment":
      return "manual_adjustment";
    default:
      return "technical_sync";
  }
}

/**
 * Déduit reason + mode à partir de la dernière transaction fidélité (scan / worker).
 */
export function deriveWalletUpdateContext(
  lastTransaction: LastTransactionSnapshot,
  snapshot: WalletPassSyncSnapshot,
  vm: Pick<WalletCardViewModel, "rewardsAvailable">,
): WalletUpdateContext {
  if (isRewardUnlockedEvent(lastTransaction, snapshot, vm)) {
    const reason: WalletUpdateReason = "reward_unlocked";
    return {
      reason,
      notificationMode: getDefaultNotificationMode(reason),
    };
  }

  const reason = mapTransactionTypeToReason(lastTransaction?.type);
  return {
    reason,
    notificationMode: getDefaultNotificationMode(reason),
  };
}

/** TODO Phase 8+ : quota 1 notification marketing / client / jour (hors silent). */
export function isMarketingNotifyAllowed(_membershipId: string): boolean {
  return true;
}
