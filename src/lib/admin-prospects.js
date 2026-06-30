import { supabase } from '@/lib/supabase';

const ADMIN_PROSPECTS_FUNCTION = 'admin-prospects';

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');
  const { url, anonKey } = getSupabaseConfig();
  return {
    url: `${url.replace(/\/$/, '')}/functions/v1/${ADMIN_PROSPECTS_FUNCTION}`,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
  };
}

export async function fetchAdminProspects(filters = {}) {
  const { url, headers } = await getAuthHeaders();
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });

  const response = await fetch(`${url}?${params.toString()}`, { headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Chargement impossible');
  return data;
}

export async function fetchAdminProspect(id) {
  const { url, headers } = await getAuthHeaders();
  const response = await fetch(`${url}?id=${encodeURIComponent(id)}`, { headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Prospect introuvable');
  return data.prospect;
}

export async function patchAdminProspect(id, patch) {
  const { url, headers } = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ id, ...patch }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Mise à jour impossible');
  return data.prospect;
}

export async function quickUpdateProspectStatus(id, status) {
  const { url, headers } = await getAuthHeaders();
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'quick_status', id, status }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Mise à jour impossible');
  return data.prospect;
}
