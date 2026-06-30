/**
 * Préparation des textes pour notifications Wallet (Apple changeMessage, Google addMessage).
 * Normalise Unicode, retire les caractères de contrôle, préserve les emojis.
 */

export const GOOGLE_WALLET_NOTIFY_HEADER_MAX = 120;
export const GOOGLE_WALLET_NOTIFY_BODY_MAX = 500;

/** Caractères de contrôle ASCII + BOM — pas les ZWJ (composants emoji). */
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\uFEFF]/g;

export function sanitizeWalletNotifyText(value: unknown): string {
  const text = typeof value === "string" ? value : String(value ?? "");
  return text
    .normalize("NFC")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function truncateWalletNotifyText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 1) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function prepareGoogleWalletNotifyTexts(header: string, body: string): {
  header: string;
  body: string;
} {
  return {
    header: truncateWalletNotifyText(
      sanitizeWalletNotifyText(header),
      GOOGLE_WALLET_NOTIFY_HEADER_MAX,
    ),
    body: truncateWalletNotifyText(
      sanitizeWalletNotifyText(body),
      GOOGLE_WALLET_NOTIFY_BODY_MAX,
    ),
  };
}

/** Suffixe invisible pour forcer un changement de champ Apple lors d'un renvoi. */
export function buildApplePromoNotifyFieldValue(message: string, notifyBatchId?: string): string {
  const clean = sanitizeWalletNotifyText(message);
  if (!clean || !notifyBatchId) return clean;

  const hash = notifyBatchId.replace(/[^a-f0-9]/gi, "").slice(-8) || String(Date.now());
  const zwspCount = (Number.parseInt(hash.slice(0, 4), 16) % 8) + 1;
  return clean + "\u200b".repeat(zwspCount);
}

export function buildGoogleWalletNotifyMessageId(
  membershipId: string,
  kind: string,
  notifyBatchId?: string,
): string {
  const batchPart = (notifyBatchId || String(Date.now())).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 24);
  return `notify-${membershipId.slice(0, 8)}-${kind}-${batchPart}`.slice(0, 64);
}
