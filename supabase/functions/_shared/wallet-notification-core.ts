/**
 * Notifications Wallet transactionnelles (Phase 7).
 * Déclenchées par mise à jour de carte — pas des push marketing libres.
 */

import type { ApplePassFieldSet } from "./wallet-card-model.ts";
import type { WalletCardViewModel, WalletProgramType } from "./wallet-card-model.ts";

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
};

function balanceWord(programType: WalletProgramType, plural = true): string {
  if (programType === "stamps") return plural ? "tampons" : "tampon";
  return plural ? "points" : "point";
}

function formatEarnedBalanceMessage(
  programType: WalletProgramType,
  delta: number,
  newBalance: number,
): string {
  const unit = balanceWord(programType, delta > 1);
  return `Vous avez gagné ${delta} ${unit}. Nouveau solde : ${newBalance}.`;
}

export function resolveWalletNotificationPlan(
  vm: WalletCardViewModel,
  snapshot: WalletPassSyncSnapshot,
  lastTransaction: LastTransactionSnapshot,
): WalletNotificationPlan {
  const silent: WalletNotificationPlan = {
    kind: "none",
    notifyGoogle: false,
    notifyApple: false,
    google: { notify: false, header: "", body: "", kind: "none" },
    apple: { notifyBalance: false, notifyReward: false },
  };

  const prevBalance = snapshot.last_synced_balance;
  const prevRewards = snapshot.last_synced_rewards_available;
  const balanceChanged = prevBalance === null ? false : prevBalance !== vm.balance;
  const rewardsIncreased = prevRewards !== null && vm.rewardsAvailable > prevRewards;

  const txType = lastTransaction?.type ?? null;
  const isRedeem = txType === "redeem_reward";

  if (isRedeem) {
    return silent;
  }

  const rewardUnlockedFromTx = lastTransaction && lastTransaction.rewards_delta > 0;
  const rewardUnlocked = rewardUnlockedFromTx || rewardsIncreased;

  if (rewardUnlocked) {
    const alreadySyncedRewards = prevRewards !== null && vm.rewardsAvailable <= prevRewards;
    if (alreadySyncedRewards && !rewardsIncreased) {
      return silent;
    }

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
    };
  }

  if (lastTransaction?.type === "earn_stamp" && lastTransaction.stamps_delta > 0) {
    const isNewEarn = snapshot.last_synced_balance === null || balanceChanged;
    if (!isNewEarn) return silent;

    const delta = lastTransaction.stamps_delta;
    const body = formatEarnedBalanceMessage("stamps", delta, vm.balance);
    const stampMilestone = vm.programType === "stamps"
      && snapshot.last_synced_balance !== null
      && vm.balance === 0
      && delta > 0;

    return {
      kind: stampMilestone ? "reward_unlocked" : "stamp_earned",
      notifyGoogle: true,
      notifyApple: true,
      google: {
        notify: true,
        header: stampMilestone ? "Tampon complet !" : "Tampon ajouté",
        body: stampMilestone
          ? `Votre ${vm.rewardLabel.toLowerCase()} est prête !`
          : body,
        kind: stampMilestone ? "reward_unlocked" : "stamp_earned",
      },
      apple: {
        notifyBalance: true,
        notifyReward: false,
        balanceChangeMessage: stampMilestone
          ? "Félicitations — %@ tampons"
          : "Vous avez maintenant %@ tampons",
      },
    };
  }

  if (lastTransaction?.type === "earn_points" && lastTransaction.points_delta > 0) {
    const isNewEarn = prevBalance === null || balanceChanged;
    if (!isNewEarn) return silent;

    const delta = lastTransaction.points_delta;
    return {
      kind: "balance_earned",
      notifyGoogle: true,
      notifyApple: true,
      google: {
        notify: true,
        header: "Points gagnés",
        body: formatEarnedBalanceMessage("points", delta, vm.balance),
        kind: "balance_earned",
      },
      apple: {
        notifyBalance: true,
        notifyReward: false,
        balanceChangeMessage: "Vous avez maintenant %@ points",
      },
    };
  }

  if (balanceChanged && !isRedeem) {
    const increased = prevBalance !== null && vm.balance > prevBalance;
    if (!increased) return silent;

    return {
      kind: "balance_updated",
      notifyGoogle: true,
      notifyApple: true,
      google: {
        notify: true,
        header: "Solde mis à jour",
        body: `Votre nouveau solde est de ${vm.balance} ${balanceWord(vm.programType)}.`,
        kind: "balance_updated",
      },
      apple: {
        notifyBalance: true,
        notifyReward: false,
        balanceChangeMessage: vm.programType === "stamps"
          ? "Vous avez maintenant %@ tampons"
          : "Vous avez maintenant %@ points",
      },
    };
  }

  return silent;
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
