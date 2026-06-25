/** Palette et assets RegalClic — carte fidélité Wallet V1 */

export const REGALCLIC_WALLET_ISSUER_NAME = "RegalClic";
export const REGALCLIC_WALLET_LOYALTY_LABEL = "Carte de fidélité";

export const REGALCLIC_WALLET_PRIMARY_HEX = "#0B1E3F";
export const REGALCLIC_WALLET_ACCENT_TEAL_HEX = "#44C4A1";

export function hexToRgbString(hex: string): string | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgb(${r},${g},${b})`;
}

export function resolvePrimaryRgb(hex?: string | null): string {
  const candidate = (hex || Deno.env.get("REGALCLIC_WALLET_PRIMARY_HEX") || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) {
    return hexToRgbString(candidate) || "rgb(11,30,63)";
  }
  return hexToRgbString(REGALCLIC_WALLET_PRIMARY_HEX) || "rgb(11,30,63)";
}

export function resolveLabelRgb(): string {
  return hexToRgbString(REGALCLIC_WALLET_ACCENT_TEAL_HEX) || "rgb(68,196,161)";
}

export function resolveFallbackLogoUrl(): string {
  const explicit = (Deno.env.get("REGALCLIC_WALLET_LOGO_URL") || "").trim();
  if (explicit.startsWith("https://")) return explicit;
  const appUrl = (Deno.env.get("WALLET_PUBLIC_APP_URL") || Deno.env.get("VITE_PUBLIC_APP_URL") || "").trim();
  if (appUrl.startsWith("https://")) {
    return `${appUrl.replace(/\/$/, "")}/regalclic-logo.png`;
  }
  return "https://regalclic.app/regalclic-logo-on-dark.png";
}

export function resolvePrimaryHex(hex?: string | null): string {
  const candidate = (hex || Deno.env.get("REGALCLIC_WALLET_PRIMARY_HEX") || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(candidate)) return candidate;
  return REGALCLIC_WALLET_PRIMARY_HEX;
}

/** Classe Google Wallet dédiée à un commerce. */
export function googleWalletClassId(issuerId: string, businessId: string): string {
  const slug = businessId.replaceAll("-", "").slice(0, 20);
  return `${issuerId}.regalclic-business-${slug}`;
}

/** Objet Google Wallet dédié à une membership. */
export function googleWalletObjectId(issuerId: string, membershipId: string): string {
  const slug = membershipId.replaceAll("-", "").slice(0, 24);
  return `${issuerId}.regalclic-mbr-${slug}`;
}

export function resolveGoogleLogoUrl(businessLogoUrl?: string | null): string {
  const logo = (businessLogoUrl || "").trim().split("?")[0];
  if (logo.startsWith("https://")) return logo;
  return resolveFallbackLogoUrl();
}
