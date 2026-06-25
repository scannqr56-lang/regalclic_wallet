// deno-lint-ignore-file no-explicit-any
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";
import {
  REGALCLIC_WALLET_ISSUER_NAME,
  REGALCLIC_WALLET_LOYALTY_LABEL,
  googleWalletClassId,
  googleWalletObjectId,
  resolveGoogleLogoUrl,
  resolvePrimaryHex,
} from "./wallet-branding.ts";

export class GoogleWalletError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "GoogleWalletError";
  }
}

function normalizePrivateKey(value: string) {
  return value.replaceAll("\\n", "\n");
}

export async function getGoogleAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
  const privateKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") || "";
  if (!clientEmail || !privateKeyRaw) {
    throw new GoogleWalletError("Secrets Google manquants (GOOGLE_SERVICE_ACCOUNT_EMAIL / KEY)", 500);
  }

  const privateKey = await importPKCS8(normalizePrivateKey(privateKeyRaw), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/wallet_object.issuer" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new GoogleWalletError(`OAuth Google invalide: ${await res.text()}`, 500);
  }

  const data = await res.json();
  return String(data.access_token || "");
}

function buildGoogleClassBody(businessName: string, logoUrl: string, primaryHex: string) {
  return {
    issuerName: REGALCLIC_WALLET_ISSUER_NAME,
    programName: businessName,
    reviewStatus: (Deno.env.get("GOOGLE_WALLET_REVIEW_STATUS") || "UNDER_REVIEW").trim(),
    hexBackgroundColor: primaryHex,
    programLogo: {
      sourceUri: { uri: logoUrl },
      contentDescription: {
        defaultValue: { language: "fr-FR", value: businessName },
      },
    },
  };
}

export async function upsertGoogleClass(
  accessToken: string,
  classId: string,
  businessName: string,
  logoUrl: string,
  primaryHex: string,
) {
  const base = "https://walletobjects.googleapis.com/walletobjects/v1";
  const classBody = buildGoogleClassBody(businessName, logoUrl, primaryHex);

  const getRes = await fetch(`${base}/loyaltyClass/${encodeURIComponent(classId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (getRes.ok) {
    const patchRes = await fetch(`${base}/loyaltyClass/${encodeURIComponent(classId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(classBody),
    });
    if (!patchRes.ok) {
      throw new GoogleWalletError(`Mise à jour class Google impossible: ${await patchRes.text()}`, 500);
    }
    return;
  }

  if (getRes.status !== 404) {
    throw new GoogleWalletError(`Lecture class Google impossible: ${await getRes.text()}`, 500);
  }

  const createRes = await fetch(`${base}/loyaltyClass`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: classId, ...classBody }),
  });

  if (!createRes.ok) {
    throw new GoogleWalletError(`Création class Google impossible: ${await createRes.text()}`, 500);
  }
}

export type GoogleMembershipContext = {
  membershipId: string;
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  primaryColorHex: string | null;
  customerFirstName: string;
  cardNumber: string;
  qrToken: string;
  programType: "points" | "stamps";
  balance: number;
  rewardLabel: string;
  rewardsAvailable: number;
};

export function buildGoogleObjectBody(ctx: GoogleMembershipContext, classId: string) {
  const balanceLabel = ctx.programType === "stamps" ? "Tampons" : "Points";
  const textModules: Array<{ id: string; header: string; body: string }> = [
    {
      id: "program",
      header: REGALCLIC_WALLET_LOYALTY_LABEL,
      body: ctx.rewardLabel,
    },
  ];

  if (ctx.rewardsAvailable > 0) {
    textModules.push({
      id: "reward_available",
      header: "Récompense disponible",
      body: `${ctx.rewardsAvailable} à utiliser`,
    });
  }

  return {
    classId,
    state: "ACTIVE",
    accountId: ctx.membershipId.replaceAll("-", "").slice(0, 20),
    accountName: ctx.customerFirstName,
    notifyPreference: "NOTIFY_ON_UPDATE",
    barcode: {
      type: "QR_CODE",
      value: ctx.qrToken,
      alternateText: ctx.cardNumber,
    },
    loyaltyPoints: {
      label: balanceLabel,
      balance: { int: ctx.balance },
    },
    textModulesData: textModules,
  };
}

export async function upsertGoogleObject(
  accessToken: string,
  objectId: string,
  body: Record<string, unknown>,
) {
  const base = "https://walletobjects.googleapis.com/walletobjects/v1";

  const patchRes = await fetch(`${base}/loyaltyObject/${encodeURIComponent(objectId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (patchRes.ok) return;

  if (patchRes.status !== 404) {
    throw new GoogleWalletError(`PATCH objet Google impossible: ${await patchRes.text()}`, 500);
  }

  const createRes = await fetch(`${base}/loyaltyObject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: objectId, ...body }),
  });

  if (!createRes.ok) {
    throw new GoogleWalletError(`Création objet Google impossible: ${await createRes.text()}`, 500);
  }
}

export async function patchGoogleLoyaltyObject(
  accessToken: string,
  objectId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const base = "https://walletobjects.googleapis.com/walletobjects/v1";
  const patchRes = await fetch(`${base}/loyaltyObject/${encodeURIComponent(objectId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!patchRes.ok) {
    throw new GoogleWalletError(`PATCH objet Google impossible: ${await patchRes.text()}`, 500);
  }
}

export function buildGoogleSyncPatchBody(ctx: GoogleMembershipContext, issuerId: string) {
  const classId = googleWalletClassId(issuerId, ctx.businessId);
  const full = buildGoogleObjectBody(ctx, classId);
  const balanceLabel = ctx.programType === "stamps" ? "tampons" : "points";

  return {
    loyaltyPoints: full.loyaltyPoints,
    textModulesData: full.textModulesData,
    accountName: full.accountName,
    notifyPreference: "NOTIFY_ON_UPDATE",
    messages: [{
      id: `sync-${ctx.membershipId.slice(0, 8)}-${ctx.balance}`,
      header: "Solde mis à jour",
      body: `Vous avez maintenant ${ctx.balance} ${balanceLabel}.`,
      messageType: "TEXT_AND_NOTIFY",
    }],
  };
}

export async function buildGoogleSaveUrl(classId: string, objectId: string): Promise<string> {
  const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
  const privateKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") || "";
  if (!clientEmail || !privateKeyRaw) {
    throw new GoogleWalletError("Secrets Google manquants pour Save to Wallet", 500);
  }

  const origins = (Deno.env.get("GOOGLE_WALLET_ORIGINS") || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const privateKey = await importPKCS8(normalizePrivateKey(privateKeyRaw), "RS256");
  const token = await new SignJWT({
    iss: clientEmail,
    aud: "google",
    typ: "savetowallet",
    origins,
    payload: {
      loyaltyObjects: [{ id: objectId, classId }],
    },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  return `https://pay.google.com/gp/v/save/${token}`;
}

export async function provisionGoogleWalletForMembership(
  ctx: GoogleMembershipContext,
): Promise<{ saveUrl: string; objectId: string; classId: string }> {
  const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID") || "";
  if (!issuerId) {
    throw new GoogleWalletError("GOOGLE_WALLET_ISSUER_ID manquant", 500);
  }

  const classId = googleWalletClassId(issuerId, ctx.businessId);
  const objectId = googleWalletObjectId(issuerId, ctx.membershipId);
  const logoUrl = resolveGoogleLogoUrl(ctx.businessLogoUrl);
  const primaryHex = resolvePrimaryHex(ctx.primaryColorHex);

  const accessToken = await getGoogleAccessToken();
  await upsertGoogleClass(accessToken, classId, ctx.businessName, logoUrl, primaryHex);
  await upsertGoogleObject(accessToken, objectId, buildGoogleObjectBody(ctx, classId));

  const saveUrl = await buildGoogleSaveUrl(classId, objectId);
  return { saveUrl, objectId, classId };
}
