import { assertEquals } from "jsr:@std/assert";
import {
  buildApplePromoNotifyFieldValue,
  buildGoogleWalletNotifyMessageId,
  prepareGoogleWalletNotifyTexts,
  sanitizeWalletNotifyText,
} from "./wallet-notification-text.ts";

Deno.test("sanitizeWalletNotifyText — préserve les emojis", () => {
  const input = "🎉 -20% sur les desserts ce week-end !";
  assertEquals(sanitizeWalletNotifyText(input), input);
});

Deno.test("sanitizeWalletNotifyText — retire les caractères de contrôle", () => {
  assertEquals(sanitizeWalletNotifyText("Hello\u0007World"), "HelloWorld");
});

Deno.test("prepareGoogleWalletNotifyTexts — tronque le corps", () => {
  const long = "A".repeat(600);
  const { body } = prepareGoogleWalletNotifyTexts("Offre", long);
  assertEquals(body.length <= 500, true);
  assertEquals(body.endsWith("…"), true);
});

Deno.test("buildApplePromoNotifyFieldValue — suffixe invisible si batch", () => {
  const value = buildApplePromoNotifyFieldValue("Promo du jour", "batch-abc123");
  assertEquals(value.startsWith("Promo du jour"), true);
  assertEquals(value.length > "Promo du jour".length, true);
});

Deno.test("buildGoogleWalletNotifyMessageId — id stable et court", () => {
  const id = buildGoogleWalletNotifyMessageId("00000000-1111-2222-3333-444444444444", "campaign_promo", "batch-1");
  assertEquals(id.length <= 64, true);
  assertEquals(id.includes("campaign_promo"), true);
});
