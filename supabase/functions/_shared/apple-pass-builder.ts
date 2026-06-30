import JSZip from "https://esm.sh/jszip@3.10.1";
import forge from "https://esm.sh/node-forge@1.3.1";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  REGALCLIC_WALLET_ISSUER_NAME,
  resolveFallbackLogoUrl,
  resolveLabelRgb,
  resolvePrimaryRgb,
} from "./wallet-branding.ts";
import {
  buildWalletCardViewModel,
  mapViewModelToAppleFields,
  WALLET_DEFAULT_TEXTS,
  type ApplePassFieldSet,
  type WalletCardDbInput,
  type WalletCardViewModel,
} from "./wallet-card-model.ts";
import { generateStampStripPng } from "./stamp-strip-generator.ts";
import {
  applyAppleNotificationHints,
  type AppleNotificationHints,
} from "./wallet-notification-core.ts";
import { fetchActiveWalletCampaign } from "./wallet-campaign-queries.ts";

export type ApplePassBuildInput = {
  viewModel: WalletCardViewModel;
  serialNumber: string;
  authToken: string;
  webServiceURL: string;
  passTypeIdentifier: string;
  teamIdentifier: string;
  notificationHints?: AppleNotificationHints | null;
};

export const BUSINESS_WALLET_SELECT =
  "id, name, slug, logo_url, primary_color, wallet_label_color, address, city, postal_code, phone, website, order_url, instagram_url, wallet_promo_message, wallet_terms, wallet_hero_url";

export const MEMBERSHIP_WALLET_SELECT = `
  id,
  card_number,
  qr_token,
  points_balance,
  stamps_balance,
  rewards_available,
  apple_serial_number,
  apple_auth_token,
  updated_at,
  customers ( first_name, last_name ),
  loyalty_programs ( type, reward_label, points_per_euro, stamps_required, reward_threshold )
`;

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
  const trimmed = imageUrl.trim().split("?")[0];
  if (!trimmed.startsWith("https://")) return null;
  try {
    const response = await fetch(trimmed, { headers: { Accept: "image/*" } });
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

type PassImages = {
  icon1x: Uint8Array;
  icon2x: Uint8Array;
  logo1x: Uint8Array;
  logo2x: Uint8Array;
  strip1x?: Uint8Array;
  strip2x?: Uint8Array;
  hasBusinessLogo: boolean;
};

/** Icon carré (RegalClic) séparé du logo commerce rectangulaire. */
async function resolvePassImages(
  businessLogoUrl?: string | null,
  heroUrl?: string | null,
  viewModel?: WalletCardViewModel | null,
): Promise<PassImages> {
  const fallbackIcon1x = base64ToBytes(ICON_1X_B64);
  const fallbackIcon2x = base64ToBytes(ICON_2X_B64);

  const logoBytes = businessLogoUrl?.trim()
    ? await fetchImageBytes(businessLogoUrl)
    : null;
  const fallbackLogoBytes = await fetchImageBytes(resolveFallbackLogoUrl());
  const logo1x = logoBytes || fallbackLogoBytes || fallbackIcon2x;
  const logo2x = logoBytes || fallbackLogoBytes || fallbackIcon2x;

  let strip1x: Uint8Array | undefined;
  let strip2x: Uint8Array | undefined;

  if (viewModel?.programType === "stamps" && viewModel.stampsRequired) {
    try {
      strip2x = await generateStampStripPng({
        filled: viewModel.balance,
        total: viewModel.stampsRequired,
        backgroundHex: viewModel.primaryColorHex,
        foregroundHex: viewModel.labelColorHex,
        width: 750,
        height: 112,
        rewardReady: viewModel.hasRewardUnlocked,
      });
      strip1x = strip2x;
    } catch (error) {
      console.error("[apple-pass] stamp strip generation failed", error);
    }
  }

  if (!strip1x || !strip2x) {
    const heroCandidate = heroUrl?.trim() || (Deno.env.get("REGALCLIC_WALLET_STRIP_URL") || "").trim();
    if (heroCandidate.startsWith("https://")) {
      const stripBytes = await fetchImageBytes(heroCandidate);
      if (stripBytes) {
        strip1x = stripBytes;
        strip2x = stripBytes;
      }
    }
  }

  return {
    icon1x: fallbackIcon1x,
    icon2x: fallbackIcon2x,
    logo1x,
    logo2x,
    strip1x,
    strip2x,
    hasBusinessLogo: Boolean(logoBytes),
  };
}

type MembershipRow = {
  id: string;
  card_number: string;
  qr_token: string;
  points_balance: number;
  stamps_balance: number;
  rewards_available: number;
  updated_at?: string | null;
  customers?: { first_name?: string | null; last_name?: string | null } | null;
  loyalty_programs?: {
    type?: string | null;
    reward_label?: string | null;
    points_per_euro?: number | null;
    stamps_required?: number | null;
    reward_threshold?: number | null;
  } | null;
};

type BusinessRow = {
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
};

export function membershipRowsToWalletCardInput(
  membership: MembershipRow,
  business: BusinessRow,
  lastTransactionAt?: string | null,
  activeCampaign?: { message: string; offer_label?: string | null } | null,
): WalletCardDbInput {
  return {
    membership: {
      id: membership.id,
      card_number: membership.card_number,
      qr_token: membership.qr_token,
      points_balance: Number(membership.points_balance || 0),
      stamps_balance: Number(membership.stamps_balance || 0),
      rewards_available: Number(membership.rewards_available || 0),
      updated_at: membership.updated_at,
    },
    customer: {
      first_name: membership.customers?.first_name,
      last_name: membership.customers?.last_name,
    },
    business: {
      id: business.id,
      name: business.name,
      logo_url: business.logo_url,
      primary_color: business.primary_color,
      wallet_label_color: business.wallet_label_color,
      address: business.address,
      city: business.city,
      postal_code: business.postal_code,
      phone: business.phone,
      website: business.website,
      order_url: business.order_url,
      instagram_url: business.instagram_url,
      wallet_promo_message: business.wallet_promo_message,
      wallet_terms: business.wallet_terms,
      wallet_hero_url: business.wallet_hero_url,
    },
    program: {
      type: membership.loyalty_programs?.type,
      reward_label: membership.loyalty_programs?.reward_label,
      points_per_euro: membership.loyalty_programs?.points_per_euro,
      stamps_required: membership.loyalty_programs?.stamps_required,
      reward_threshold: membership.loyalty_programs?.reward_threshold,
    },
    lastTransactionAt: lastTransactionAt ?? null,
    activeCampaign: activeCampaign ?? null,
  };
}

async function fetchLastTransactionAt(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("loyalty_transactions")
    .select("created_at")
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}

export async function buildApplePkpass(input: ApplePassBuildInput): Promise<Uint8Array> {
  const vm = input.viewModel;
  const fields = mapViewModelToAppleFields(vm);

  if (vm.promoMessage || input.notificationHints?.promoNotifyValue) {
    fields.auxiliaryFields.unshift({
      key: "tagline",
      label: " ",
      value: input.notificationHints?.promoNotifyValue ?? vm.promoMessage ?? "",
    });
  }

  if (vm.hasRewardUnlocked) {
    const rewardBanner = {
      key: "reward_unlocked_banner",
      label: WALLET_DEFAULT_TEXTS.rewardUnlockedShort,
      value: vm.rewardsAvailableText || vm.rewardUnlockedBannerText || vm.rewardLabel,
    } as { key: string; label: string; value: string; changeMessage?: string };

    if (!input.notificationHints?.suppressRewardBannerNotify) {
      rewardBanner.changeMessage = "Récompense : %@";
    }

    fields.auxiliaryFields.unshift(rewardBanner);
  }

  applyAppleNotificationHints(fields, input.notificationHints ?? null);

  const passStyleKey = vm.applePassStyle === "storeCard" ? "storeCard" : "generic";
  const barcodePayload = {
    message: vm.qrToken,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: vm.cardNumber,
  };

  const images = await resolvePassImages(vm.logoUrl, vm.heroUrl, vm);
  const backgroundColor = resolvePrimaryRgb(vm.primaryColorHex);
  const labelColor = resolveLabelRgb(vm.labelColorHex);

  const passJson: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: input.passTypeIdentifier,
    serialNumber: input.serialNumber,
    teamIdentifier: input.teamIdentifier,
    organizationName: vm.organizationName,
    description: vm.passDescription,
    logoText: images.hasBusinessLogo ? "" : REGALCLIC_WALLET_ISSUER_NAME,
    foregroundColor: "rgb(255,255,255)",
    backgroundColor,
    labelColor,
    barcode: barcodePayload,
    barcodes: [barcodePayload],
    [passStyleKey]: {
      headerFields: fields.headerFields,
      primaryFields: fields.primaryFields,
      secondaryFields: fields.secondaryFields,
      auxiliaryFields: fields.auxiliaryFields,
      backFields: fields.backFields,
    },
    webServiceURL: input.webServiceURL,
    authenticationToken: input.authToken,
  };

  const zip = new JSZip();
  const passJsonText = JSON.stringify(passJson);
  const { icon1x, icon2x, logo1x, logo2x, strip1x, strip2x } = images;

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

  if (strip1x && strip2x) {
    zip.file("strip.png", strip1x);
    zip.file("strip@2x.png", strip2x);
    manifestEntries.push(["strip.png", strip1x], ["strip@2x.png", strip2x]);
  }

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

export async function buildPkpassFromDbInput(
  dbInput: WalletCardDbInput,
  meta: Omit<ApplePassBuildInput, "viewModel">,
): Promise<Uint8Array> {
  const viewModel = buildWalletCardViewModel(dbInput);
  return await buildApplePkpass({ viewModel, ...meta });
}

export type ApplePassDbContext = {
  membershipId: string;
  serialNumber: string;
  authToken: string;
  dbInput: WalletCardDbInput;
};

export async function loadApplePassContextBySerial(
  supabase: SupabaseClient,
  serialNumber: string,
): Promise<ApplePassDbContext | null> {
  const { data: membership, error } = await supabase
    .from("customer_memberships")
    .select(`
      ${MEMBERSHIP_WALLET_SELECT},
      businesses ( ${BUSINESS_WALLET_SELECT} )
    `)
    .eq("apple_serial_number", serialNumber)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership?.apple_auth_token || !membership.qr_token) return null;

  const business = membership.businesses as BusinessRow | null;
  if (!business?.id) return null;

  const lastTransactionAt = await fetchLastTransactionAt(supabase, membership.id);
  const activeCampaign = await fetchActiveWalletCampaign(supabase, business.id);

  return {
    membershipId: membership.id,
    serialNumber: membership.apple_serial_number || serialNumber,
    authToken: membership.apple_auth_token,
    dbInput: membershipRowsToWalletCardInput(
      membership as MembershipRow,
      business,
      lastTransactionAt,
      activeCampaign,
    ),
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
  if (!passTypeIdentifier || !teamIdentifier) {
    throw new Error("Secrets Apple manquants (APPLE_PASS_TYPE_IDENTIFIER / APPLE_TEAM_ID)");
  }

  const { data: applePass } = await supabase
    .from("wallet_passes")
    .select("pending_notification")
    .eq("membership_id", ctx.membershipId)
    .eq("platform", "apple")
    .maybeSingle();

  const notificationHints = applePass?.pending_notification as AppleNotificationHints | null;

  const passBytes = await buildPkpassFromDbInput(ctx.dbInput, {
    serialNumber: ctx.serialNumber,
    authToken: ctx.authToken,
    webServiceURL: `${supabaseUrl}/functions/v1/wallet-apple-webhook`,
    passTypeIdentifier,
    teamIdentifier,
    notificationHints,
  });

  if (applePass?.pending_notification) {
    await supabase
      .from("wallet_passes")
      .update({ pending_notification: null })
      .eq("membership_id", ctx.membershipId)
      .eq("platform", "apple");
  }

  return passBytes;
}
