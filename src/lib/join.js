import { supabase } from '@/lib/supabase';

const FUNCTION_NAME = 'public-join';

function getFunctionsBaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  return `${url.replace(/\/$/, '')}/functions/v1/${FUNCTION_NAME}`;
}

export async function fetchBusinessPublicBySlug(slug) {
  const { data, error } = await supabase.rpc('get_business_public_by_slug', {
    p_slug: slug,
  });
  if (error) throw error;
  return data;
}

export async function submitPublicJoin(payload) {
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
    throw new Error(data.error || 'Inscription impossible');
  }
  return data;
}

export async function fetchPublicMembershipSummary(businessSlug, membershipId) {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  const url = new URL(getFunctionsBaseUrl());
  url.searchParams.set('business_slug', businessSlug);
  url.searchParams.set('membership_id', membershipId);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Carte introuvable');
  }
  return data;
}
