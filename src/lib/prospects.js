const FUNCTION_NAME = 'public-prospect';

function getFunctionsBaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  return `${url.replace(/\/$/, '')}/functions/v1/${FUNCTION_NAME}`;
}

export async function submitSalesProspect(payload) {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  const response = await fetch(getFunctionsBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Enregistrement impossible');
  }
  return data;
}
