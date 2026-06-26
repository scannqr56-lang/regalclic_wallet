// deno-lint-ignore-file no-explicit-any
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";
import {
  REGALCLIC_WALLET_ISSUER_NAME,
  googleWalletClassId,
  googleWalletObjectId,
  resolveGoogleLogoUrl,
} from "./wallet-branding.ts";
import {
  buildWalletCardViewModel,
  buildGoogleClassTemplateInfo,
  mapViewModelToGoogleFields,
  type WalletCardDbInput,
  type WalletCardViewModel,
} from "./wallet-card-model.ts";
import type { WalletNotificationPlan } from "./wallet-notification-core.ts";

export class GoogleWalletError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "GoogleWalletError";
  }
}

function normalizePrivateKey(value: string) {
  return value.replaceAll("\\n", "\n");
}

function resolveHeroImageUrl(vm: WalletCardViewModel): string | null {
  const hero = (vm.heroUrl || "").trim().split("?")[0];
  if (hero.startsWith("https://")) return hero;
  const fallback = (Deno.env.get("REGALCLIC_WALLET_STRIP_URL") || "").trim().split("?")[0];
  if (fallback.startsWith("https://")) return fallback;
  return null;
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

export function buildGoogleClassBody(vm: WalletCardViewModel): Record<string, unknown> {
  const logoUrl = resolveGoogleLogoUrl(vm.logoUrl);
  const heroUrl = resolveHeroImageUrl(vm);

  const body: Record<string, unknown> = {
    issuerName: REGALCLIC_WALLET_ISSUER_NAME,
    programName: vm.businessName,
    reviewStatus: (Deno.env.get("GOOGLE_WALLET_REVIEW_STATUS") || "UNDER_REVIEW").trim(),
    hexBackgroundColor: vm.primaryColorHex,
    accountNameLabel: "Client",
    classTemplateInfo: buildGoogleClassTemplateInfo(),
    programLogo: {
      sourceUri: { uri: logoUrl },
      contentDescription: {
        defaultValue: { language: "fr-FR", value: vm.businessName },
      },
    },
  };

  if (heroUrl) {
    body.heroImage = {
      sourceUri: { uri: heroUrl },
      contentDescription: {
        defaultValue: { language: "fr-FR", value: `Carte fidélité ${vm.businessName}` },
      },
    };
  }

  return body;
}

export async function upsertGoogleClass(
  accessToken: string,
  classId: string,
  vm: WalletCardViewModel,
) {
  const base = "https://walletobjects.googleapis.com/walletobjects/v1";
  const classBody = buildGoogleClassBody(vm);

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

function buildGoogleLinksModule(vm: WalletCardViewModel) {
  const fields = mapViewModelToGoogleFields(vm);
  if (fields.linksModuleData.length === 0) return undefined;
  return {
    uris: fields.linksModuleData.map((link) => ({
      id: link.id,
      description: link.description,
      uri: link.uri,
    })),
  };
}

function buildGoogleLoyaltyPointsFields(fields: ReturnType<typeof mapViewModelToGoogleFields>) {
  return {
    loyaltyPoints: {
      label: fields.loyaltyPointsLabel,
      balance: { int: fields.loyaltyPointsBalance },
    },
    secondaryLoyaltyPoints: {
      label: fields.secondaryLoyaltyPointsLabel,
      balance: { int: fields.secondaryLoyaltyPointsBalance },
    },
  };
}

export function buildGoogleObjectBody(vm: WalletCardViewModel, classId: string): Record<string, unknown> {
  const fields = mapViewModelToGoogleFields(vm);
  const linksModuleData = buildGoogleLinksModule(vm);
  const pointsFields = buildGoogleLoyaltyPointsFields(fields);

  const body: Record<string, unknown> = {
    classId,
    state: "ACTIVE",
    accountId: vm.membershipId.replaceAll("-", "").slice(0, 20),
    accountName: fields.accountName,
    notifyPreference: "NOTIFY_ON_UPDATE",
    barcode: {
      type: "QR_CODE",
      value: vm.qrToken,
      alternateText: fields.alternateText,
    },
    ...pointsFields,
    textModulesData: fields.textModulesData,
  };

  if (linksModuleData) {
    body.linksModuleData = linksModuleData;
  }

  return body;
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

export function buildGoogleSyncPatchBody(
  vm: WalletCardViewModel,
  notification?: WalletNotificationPlan,
): Record<string, unknown> {
  const fields = mapViewModelToGoogleFields(vm);
  const linksModuleData = buildGoogleLinksModule(vm);

  const body: Record<string, unknown> = {
    accountName: fields.accountName,
    notifyPreference: "NOTIFY_ON_UPDATE",
    ...buildGoogleLoyaltyPointsFields(fields),
    textModulesData: fields.textModulesData,
  };

  const plan = notification;
  if (plan?.notifyGoogle && plan.google.notify && plan.google.body) {
    body.messages = [{
      id: `sync-${vm.membershipId.slice(0, 8)}-${plan.kind}-${vm.balance}-${Date.now()}`,
      header: plan.google.header,
      body: plan.google.body,
      messageType: "TEXT_AND_NOTIFY",
    }];
  }

  if (linksModuleData) {
    body.linksModuleData = linksModuleData;
  }

  return body;
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

export async function provisionGoogleWalletForDbInput(
  dbInput: WalletCardDbInput,
): Promise<{ saveUrl: string; objectId: string; classId: string }> {
  const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID") || "";
  if (!issuerId) {
    throw new GoogleWalletError("GOOGLE_WALLET_ISSUER_ID manquant", 500);
  }

  const vm = buildWalletCardViewModel(dbInput);
  const classId = googleWalletClassId(issuerId, vm.businessId);
  const objectId = googleWalletObjectId(issuerId, vm.membershipId);

  const accessToken = await getGoogleAccessToken();
  await upsertGoogleClass(accessToken, classId, vm);
  await upsertGoogleObject(accessToken, objectId, buildGoogleObjectBody(vm, classId));

  const saveUrl = await buildGoogleSaveUrl(classId, objectId);
  return { saveUrl, objectId, classId };
}
