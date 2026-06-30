import { assertEquals } from "jsr:@std/assert";
import { resolveCampaignPromoNotificationPlan } from "./wallet-notification-core.ts";
import type { WalletCardViewModel } from "./wallet-card-model.ts";

const baseVm = {
  promoMessage: null,
  rewardLabel: "Dessert offert",
} as WalletCardViewModel;

Deno.test("resolveCampaignPromoNotificationPlan — message personnalisé Google et Apple", () => {
  const plan = resolveCampaignPromoNotificationPlan(baseVm, {
    message: "🎉 -20% sur les desserts ce week-end !",
    offer_label: "Offre week-end",
    notify_batch_id: "batch-test-001",
  });

  assertEquals(plan.kind, "campaign_promo");
  assertEquals(plan.google.header, "Offre week-end");
  assertEquals(plan.google.body, "🎉 -20% sur les desserts ce week-end !");
  assertEquals(plan.apple.promoChangeMessage, "%@");
  assertEquals(plan.apple.suppressRewardBannerNotify, true);
  assertEquals(plan.apple.promoNotifyValue?.startsWith("🎉 -20%"), true);
});

Deno.test("resolveCampaignPromoNotificationPlan — header par défaut si libellé absent", () => {
  const plan = resolveCampaignPromoNotificationPlan(baseVm, {
    message: "Profitez de notre menu du jour",
  });
  assertEquals(plan.google.header, "Offre spéciale");
});
