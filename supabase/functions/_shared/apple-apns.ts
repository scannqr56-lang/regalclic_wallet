import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";

function normalizePrivateKey(value: string) {
  return value.replaceAll("\\n", "\n");
}

function apnsHost() {
  const useSandbox = (Deno.env.get("APPLE_APNS_USE_SANDBOX") || "").toLowerCase() === "true";
  return useSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
}

async function createApnsJwt(): Promise<string | null> {
  const keyId = Deno.env.get("APPLE_APNS_KEY_ID") || "";
  const teamId = Deno.env.get("APPLE_APNS_TEAM_ID") || Deno.env.get("APPLE_TEAM_ID") || "";
  const keyPem = Deno.env.get("APPLE_APNS_KEY_PEM") || "";
  if (!keyId || !teamId || !keyPem) return null;

  const privateKey = await importPKCS8(normalizePrivateKey(keyPem), "ES256");
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

export async function sendPassKitPush(pushToken: string): Promise<{ ok: boolean; status: number; body: string }> {
  const passTypeId = Deno.env.get("APPLE_PASS_TYPE_IDENTIFIER") || "";
  const jwt = await createApnsJwt();
  if (!jwt || !passTypeId) {
    return {
      ok: false,
      status: 0,
      body: "Secrets APNs manquants (APPLE_APNS_KEY_ID / APPLE_APNS_KEY_PEM / APPLE_PASS_TYPE_IDENTIFIER)",
    };
  }

  const url = `https://${apnsHost()}/3/device/${pushToken}`;
  const headers: Record<string, string> = {
    authorization: `bearer ${jwt}`,
    "apns-topic": passTypeId,
    "apns-priority": "5",
    "apns-expiration": "0",
    "content-type": "application/json",
  };

  const pushType = (Deno.env.get("APPLE_APNS_PUSH_TYPE") || "background").trim();
  if (pushType && pushType !== "none") {
    headers["apns-push-type"] = pushType;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: "{}",
  });

  let body = "";
  try {
    body = await res.text();
  } catch {
    body = "";
  }
  return { ok: res.ok, status: res.status, body };
}

export async function pushPassKitUpdates(pushTokens: string[]): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const uniqueTokens = [...new Set(pushTokens.filter(Boolean))];
  if (!uniqueTokens.length) return { sent: 0, failed: 0, errors: [] };

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const token of uniqueTokens) {
    const result = await sendPassKitPush(token);
    if (result.ok || result.status === 410) {
      sent += 1;
    } else {
      failed += 1;
      errors.push(`token=${token.slice(0, 8)}… status=${result.status} ${result.body}`.trim());
    }
  }

  return { sent, failed, errors };
}
