import { supabase } from '@/lib/supabase';

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
