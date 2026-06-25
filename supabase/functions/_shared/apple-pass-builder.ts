import JSZip from "https://esm.sh/jszip@3.10.1";
import forge from "https://esm.sh/node-forge@1.3.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  REGALCLIC_WALLET_ISSUER_NAME,
  REGALCLIC_WALLET_LOYALTY_LABEL,
  resolveFallbackLogoUrl,
  resolveLabelRgb,
  resolvePrimaryRgb,
} from "./wallet-branding.ts";

export type ApplePassBuildInput = {
  serialNumber: string;
  authToken: string;
  qrToken: string;
  businessName: string;
  customerFirstName: string;
  organizationName: string;
  programType: "points" | "stamps";
  balance: number;
  rewardLabel: string;
  rewardsAvailable?: number;
  primaryColorHex?: string | null;
  businessLogoUrl?: string | null;
  webServiceURL: string;
  passTypeIdentifier: string;
  teamIdentifier: string;
};

export function membershipSerialNumber(membershipId: string): string {
  return `mbr_${membershipId.replaceAll("-", "")}`;
}

async function sha1Hex(data: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readApplePemEnv(name: string): string {
  return (Deno.env.get(name) || "").replaceAll("\\n", "\n");
}

const ICON_1X_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAJklEQVR42mNID3tDC8Qwau6ouaPmjpo7au6ouaPmjpo7au6gMhcAEQh0fRDvPWgAAAAASUVORK5CYII=";
const ICON_2X_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAIAAABu2d1/AAAARUlEQVR42u3OAQkAAAgDsKe0guUNYY7DYAGWnSsSXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXd0eD0my0gBxhfSsAAAAAElFTkSuQmCC";

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function fetchImageBytes(imageUrl: string): Promise<Uint8Array | null> {
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith("https://")) return null;
  try {
    const response = await fetch(trimmed.split("?")[0], {
      headers: { Accept: "image/*" },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 32 || buffer.byteLength > 2 * 1024 * 1024) return null;
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function resolvePassImages(businessLogoUrl?: string | null) {
  const fallbackIcon1x = base64ToBytes(ICON_1X_B64);
  const fallbackIcon2x = base64ToBytes(ICON_2X_B64);
  const logoUrl = businessLogoUrl?.trim() || resolveFallbackLogoUrl();
  const logoBytes = await fetchImageBytes(logoUrl);

  return {
    icon1x: logoBytes || fallbackIcon1x,
    icon2x: logoBytes || fallbackIcon2x,
    logo1x: logoBytes || fallbackIcon2x,
    logo2x: logoBytes || fallbackIcon2x,
    hasLogo: Boolean(logoBytes),
  };
}

export async function buildApplePkpass(input: ApplePassBuildInput): Promise<Uint8Array> {
  const barcodePayload = {
    message: input.qrToken,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
  };

  const images = await resolvePassImages(input.businessLogoUrl);
  const backgroundColor = resolvePrimaryRgb(input.primaryColorHex);
  const labelColor = resolveLabelRgb();
  const isStamps = input.programType === "stamps";
  const balanceLabel = isStamps ? "Tampons" : "Points";
  const changeMessage = isStamps
    ? "Vous avez maintenant %@ tampons"
    : "Vous avez maintenant %@ points";

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: input.passTypeIdentifier,
    serialNumber: input.serialNumber,
    teamIdentifier: input.teamIdentifier,
    organizationName: input.organizationName,
    description: `Carte fidélité ${input.businessName}`,
    logoText: images.hasLogo ? "" : REGALCLIC_WALLET_ISSUER_NAME,
    foregroundColor: "rgb(255,255,255)",
    backgroundColor,
    labelColor,
    barcode: barcodePayload,
    barcodes: [barcodePayload],
    generic: {
      headerFields: [{
        key: "business",
        label: REGALCLIC_WALLET_LOYALTY_LABEL,
        value: input.businessName,
      }],
      primaryFields: [{
        key: "balance",
        label: balanceLabel,
        value: input.balance.toString(),
        changeMessage,
      }],
      secondaryFields: [{
        key: "customer",
        label: "Client",
        value: input.customerFirstName,
      }],
      auxiliaryFields: [
        {
          key: "reward",
          label: "Récompense",
          value: input.rewardLabel,
        },
        ...(input.rewardsAvailable && input.rewardsAvailable > 0
          ? [{
            key: "available",
            label: "Disponible",
            value: `${input.rewardsAvailable} à utiliser`,
          }]
          : []),
      ],
      backFields: [
        {
          key: "card",
          label: "Carte",
          value: input.qrToken.slice(0, 8).toUpperCase(),
        },
        {
          key: "info",
          label: "Info",
          value: "Présentez le QR code en caisse pour cumuler votre fidélité.",
        },
      ],
    },
    webServiceURL: input.webServiceURL,
    authenticationToken: input.authToken,
  };

  const zip = new JSZip();
  const passJsonText = JSON.stringify(passJson);
  const { icon1x, icon2x, logo1x, logo2x } = images;

  zip.file("pass.json", passJsonText);
  zip.file("icon.png", icon1x);
  zip.file("icon@2x.png", icon2x);
  zip.file("logo.png", logo1x);
  zip.file("logo@2x.png", logo2x);

  const manifestEntries: [string, Uint8Array][] = [
    ["pass.json", new TextEncoder().encode(passJsonText)],
    ["icon.png", icon1x],
    ["icon@2x.png", icon2x],
    ["logo.png", logo1x],
    ["logo@2x.png", logo2x],
  ];

  const manifest: Record<string, string> = {};
  for (const [name, data] of manifestEntries) {
    manifest[name] = await sha1Hex(data);
  }
  const manifestJsonText = JSON.stringify(manifest);
  zip.file("manifest.json", manifestJsonText);

  const signerCertPem = readApplePemEnv("APPLE_SIGNER_CERT_PEM");
  const signerKeyPem = readApplePemEnv("APPLE_SIGNER_KEY_PEM");
  const wwdrCertPem = readApplePemEnv("APPLE_WWDR_CERT_PEM");
  if (!signerCertPem || !signerKeyPem || !wwdrCertPem) {
    throw new Error(
      "Certificats Apple manquants (APPLE_SIGNER_CERT_PEM / APPLE_SIGNER_KEY_PEM / APPLE_WWDR_CERT_PEM)",
    );
  }

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestJsonText, "utf8");
  const signerCert = forge.pki.certificateFromPem(signerCertPem);
  const wwdrCert = forge.pki.certificateFromPem(wwdrCertPem);
  const signerKey = forge.pki.privateKeyFromPem(signerKeyPem);
  p7.addCertificate(signerCert);
  p7.addCertificate(wwdrCert);
  p7.addSigner({
    key: signerKey,
    certificate: signerCert,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });
  const signatureDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const signatureBytes = Uint8Array.from(signatureDer, (c: string) => c.charCodeAt(0));
  zip.file("signature", signatureBytes);

  return await zip.generateAsync({ type: "uint8array" });
}

export type ApplePassDbContext = {
  membershipId: string;
  serialNumber: string;
  authToken: string;
  qrToken: string;
  businessName: string;
  customerFirstName: string;
  programType: "points" | "stamps";
  balance: number;
  rewardLabel: string;
  rewardsAvailable: number;
  primaryColorHex: string | null;
  businessLogoUrl: string | null;
  updatedAt: string;
};

export async function loadApplePassContextBySerial(
  supabase: SupabaseClient,
  serialNumber: string,
): Promise<ApplePassDbContext | null> {
  const { data: membership, error } = await supabase
    .from("customer_memberships")
    .select(`
      id,
      qr_token,
      points_balance,
      stamps_balance,
      rewards_available,
      apple_serial_number,
      apple_auth_token,
      updated_at,
      customers ( first_name ),
      businesses ( name, logo_url, primary_color ),
      loyalty_programs ( type, reward_label )
    `)
    .eq("apple_serial_number", serialNumber)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership?.apple_auth_token || !membership.qr_token) return null;

  const program = membership.loyalty_programs as { type?: string; reward_label?: string } | null;
  const business = membership.businesses as { name?: string; logo_url?: string; primary_color?: string } | null;
  const customer = membership.customers as { first_name?: string } | null;
  const programType = program?.type === "stamps" ? "stamps" : "points";
  const balance = programType === "stamps"
    ? Number(membership.stamps_balance || 0)
    : Number(membership.points_balance || 0);

  return {
    membershipId: membership.id,
    serialNumber: membership.apple_serial_number || serialNumber,
    authToken: membership.apple_auth_token,
    qrToken: membership.qr_token,
    businessName: business?.name || "Commerce",
    customerFirstName: customer?.first_name || "Client",
    programType,
    balance,
    rewardLabel: program?.reward_label || "Récompense",
    rewardsAvailable: Number(membership.rewards_available || 0),
    primaryColorHex: business?.primary_color || null,
    businessLogoUrl: business?.logo_url || null,
    updatedAt: membership.updated_at || new Date().toISOString(),
  };
}

export async function buildPkpassFromSerial(
  supabase: SupabaseClient,
  serialNumber: string,
  supabaseUrl: string,
): Promise<Uint8Array> {
  const ctx = await loadApplePassContextBySerial(supabase, serialNumber);
  if (!ctx) throw new Error("Pass introuvable ou données incomplètes");

  const passTypeIdentifier = Deno.env.get("APPLE_PASS_TYPE_IDENTIFIER") || "";
  const teamIdentifier = Deno.env.get("APPLE_TEAM_ID") || "";
  const organizationName = Deno.env.get("APPLE_ORGANIZATION_NAME") || "RegalClic";
  if (!passTypeIdentifier || !teamIdentifier) {
    throw new Error("Secrets Apple manquants (APPLE_PASS_TYPE_IDENTIFIER / APPLE_TEAM_ID)");
  }

  return await buildApplePkpass({
    serialNumber: ctx.serialNumber,
    authToken: ctx.authToken,
    qrToken: ctx.qrToken,
    businessName: ctx.businessName,
    customerFirstName: ctx.customerFirstName,
    organizationName,
    programType: ctx.programType,
    balance: ctx.balance,
    rewardLabel: ctx.rewardLabel,
    rewardsAvailable: ctx.rewardsAvailable,
    primaryColorHex: ctx.primaryColorHex,
    businessLogoUrl: ctx.businessLogoUrl,
    webServiceURL: `${supabaseUrl}/functions/v1/wallet-apple-webhook`,
    passTypeIdentifier,
    teamIdentifier,
  });
}
