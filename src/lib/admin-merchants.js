import { supabase } from '@/lib/supabase';

const ADMIN_MERCHANTS_FUNCTION = 'admin-merchants';

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

async function invokeAdminMerchants(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${ADMIN_MERCHANTS_FUNCTION}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Action administrateur impossible');
  }
  return data;
}

export function fetchAdminMerchants() {
  return invokeAdminMerchants('list').then((data) => data.merchants ?? []);
}

export function createMerchantAccount({ email, password, displayName, notes }) {
  return invokeAdminMerchants('create', {
    email,
    password,
    display_name: displayName,
    notes,
  });
}

export function updateMerchantAccount({
  userId,
  displayName,
  notes,
  password,
  business,
}) {
  return invokeAdminMerchants('update', {
    user_id: userId,
    display_name: displayName,
    notes,
    password,
    business,
  });
}

export function disableMerchantAccount(userId, reason) {
  return invokeAdminMerchants('disable', { user_id: userId, reason });
}

export function enableMerchantAccount(userId) {
  return invokeAdminMerchants('enable', { user_id: userId });
}

export function deleteMerchantAccount(userId) {
  return invokeAdminMerchants('delete', { user_id: userId });
}
