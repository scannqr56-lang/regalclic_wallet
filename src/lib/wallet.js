const APPLE_PASS_FUNCTION = 'wallet-apple-pass';

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

function getApplePassFunctionUrl(membershipId, businessSlug) {
  const { url, anonKey } = getSupabaseConfig();
  const endpoint = new URL(`${url.replace(/\/$/, '')}/functions/v1/${APPLE_PASS_FUNCTION}`);
  endpoint.searchParams.set('membership_id', membershipId);
  endpoint.searchParams.set('business_slug', businessSlug);
  return { endpoint: endpoint.toString(), anonKey };
}

/**
 * Télécharge / ouvre le .pkpass (GET — meilleure compatibilité iOS Safari).
 */
export async function openAppleWalletPass(membershipId, businessSlug) {
  const { endpoint, anonKey } = getApplePassFunctionUrl(membershipId, businessSlug);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Impossible de générer la carte Apple Wallet');
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(
    new Blob([blob], { type: 'application/vnd.apple.pkpass' }),
  );

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `regalclic-${businessSlug}.pkpass`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // iOS Safari : tenter aussi l'ouverture directe
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = blobUrl;
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export function isAppleDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}
