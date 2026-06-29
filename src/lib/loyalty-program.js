import { supabase } from '@/lib/supabase';
import { isProgramConfigured } from '@/lib/onboarding-progress';

export const EMPTY_PROGRAM_FORM = {
  type: 'points',
  name: 'Programme fidélité',
  points_per_euro: 1,
  stamps_required: 10,
  reward_label: 'Récompense offerte',
  reward_threshold: 100,
  reward_description: '',
};

export function buildProgramFormFromData(loyaltyProgram, reward) {
  if (!loyaltyProgram?.id) return { ...EMPTY_PROGRAM_FORM };

  return {
    type: loyaltyProgram.type || 'points',
    name: loyaltyProgram.name || 'Programme fidélité',
    points_per_euro: Number(loyaltyProgram.points_per_euro) || 1,
    stamps_required: Number(loyaltyProgram.stamps_required) || 10,
    reward_label: loyaltyProgram.reward_label || 'Récompense offerte',
    reward_threshold: Number(loyaltyProgram.reward_threshold) || 100,
    reward_description: reward?.description || '',
  };
}

export function getProgramStatusBadge(loyaltyProgram) {
  if (!loyaltyProgram?.id) return null;
  if (loyaltyProgram.is_active === false) {
    return { label: 'Inactif', className: 'bg-slate-200 text-slate-700' };
  }
  if (isProgramConfigured(loyaltyProgram)) {
    return { label: 'Actif', className: 'bg-emerald-100 text-emerald-800' };
  }
  return { label: 'À finaliser', className: 'bg-amber-100 text-amber-800' };
}

export function getProgramRuleSummary(loyaltyProgram) {
  if (!loyaltyProgram) return '';
  if (loyaltyProgram.type === 'stamps') {
    return `1 achat = 1 tampon — ${loyaltyProgram.stamps_required} tampons pour la récompense`;
  }
  const rate = Number(loyaltyProgram.points_per_euro) || 1;
  return `1 € dépensé = ${rate} point${rate > 1 ? 's' : ''}`;
}

export function getProgramThresholdLabel(loyaltyProgram) {
  if (!loyaltyProgram) return '';
  if (loyaltyProgram.type === 'stamps') {
    return `${loyaltyProgram.stamps_required} tampons requis`;
  }
  return `${loyaltyProgram.reward_threshold} points pour la récompense`;
}

export function formatProgramDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function saveLoyaltyProgram({ businessId, loyaltyProgram, reward, payload }) {
  if (!businessId) throw new Error('Commerce requis');

  const programPayload = {
    business_id: businessId,
    name: payload.name?.trim() || 'Programme fidélité',
    type: payload.type,
    points_per_euro: payload.points_per_euro,
    stamps_required: payload.stamps_required,
    reward_label: payload.reward_label?.trim() || 'Récompense offerte',
    reward_threshold: payload.type === 'points' ? payload.reward_threshold : payload.stamps_required,
    is_active: true,
  };

  let programId = loyaltyProgram?.id;

  if (programId) {
    const { error } = await supabase
      .from('loyalty_programs')
      .update(programPayload)
      .eq('id', programId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('loyalty_programs')
      .insert(programPayload)
      .select()
      .single();
    if (error) throw error;
    programId = data.id;
  }

  const thresholdValue = payload.type === 'points'
    ? payload.reward_threshold
    : payload.stamps_required;

  const rewardPayload = {
    loyalty_program_id: programId,
    business_id: businessId,
    name: programPayload.reward_label,
    description: payload.reward_description?.trim() || null,
    threshold_value: thresholdValue,
    type: payload.type,
    is_active: true,
  };

  if (reward?.id) {
    const { error } = await supabase.from('rewards').update(rewardPayload).eq('id', reward.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('rewards').insert(rewardPayload);
    if (error) throw error;
  }

  return programId;
}

export async function deleteLoyaltyProgram({ businessId, programId }) {
  if (!businessId || !programId) throw new Error('Programme introuvable');

  const { count, error: countError } = await supabase
    .from('customer_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  if (countError) throw countError;

  if ((count ?? 0) > 0) {
    throw new Error(
      'Vous avez déjà des clients inscrits. Vous ne pouvez pas supprimer ce programme — modifiez-le à la place.',
    );
  }

  const { error: rewardsError } = await supabase
    .from('rewards')
    .delete()
    .eq('business_id', businessId);
  if (rewardsError) throw rewardsError;

  const { error: programError } = await supabase
    .from('loyalty_programs')
    .delete()
    .eq('id', programId);
  if (programError) throw programError;
}
