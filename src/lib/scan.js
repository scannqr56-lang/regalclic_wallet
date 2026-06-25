import { supabase } from '@/lib/supabase';

const WALLET_SYNC_MEMBERSHIP_FUNCTION = 'wallet-sync-membership';

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

/**
 * Déclenche la mise à jour instantanée Google Wallet / Apple Wallet après un scan.
 */
export async function syncMembershipWallet(membershipId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Session expirée');
  }

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${WALLET_SYNC_MEMBERSHIP_FUNCTION}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ membership_id: membershipId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Synchronisation Wallet impossible');
  }
  return data;
}

export async function lookupMembershipByQrToken(qrToken) {
  const { data, error } = await supabase.rpc('lookup_membership_by_qr_token', {
    p_qr_token: qrToken,
  });
  if (error) throw error;
  return data;
}

export async function addPointsToMembership(membershipId, { amountSpent, manualPoints, note } = {}) {
  const { data, error } = await supabase.rpc('add_points_to_membership', {
    p_membership_id: membershipId,
    p_amount_spent: amountSpent ?? null,
    p_manual_points: manualPoints ?? null,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function addStampToMembership(membershipId, note) {
  const { data, error } = await supabase.rpc('add_stamp_to_membership', {
    p_membership_id: membershipId,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function redeemMembershipReward(membershipId, note) {
  const { data, error } = await supabase.rpc('redeem_reward', {
    p_membership_id: membershipId,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export function normalizeScannedValue(raw) {
  const value = (raw || '').trim();
  if (!value) return '';
  return value;
}

export function formatTransactionType(type) {
  const labels = {
    earn_points: 'Points ajoutés',
    earn_stamp: 'Tampon ajouté',
    redeem_reward: 'Récompense utilisée',
    manual_adjustment: 'Ajustement',
  };
  return labels[type] || type;
}
